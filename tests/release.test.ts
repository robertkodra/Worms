import { describe, it, expect, vi, afterEach } from "vitest";
import { Game, GameSnapshot } from "../src/game/simulation";
import { encodeSave, decodeSave } from "../src/game/save";
import { readBindings, DEFAULT_BINDINGS } from "../src/input";
import { BackgroundPlanner } from "../src/game/planner";

function expectSameSnapshot(
  actual: GameSnapshot,
  expected: GameSnapshot,
): void {
  // Compare all 1.44 million collision bytes natively. Object-by-object test
  // matcher traversal can exceed the timeout on shared CI runners.
  expect(
    Buffer.from(actual.terrain.cells).equals(
      Buffer.from(expected.terrain.cells),
    ),
  ).toBe(true);
  expect({
    ...actual,
    terrain: { ...actual.terrain, cells: undefined },
  }).toEqual({
    ...expected,
    terrain: { ...expected.terrain, cells: undefined },
  });
}

function advanceTurn(game: Game): void {
  const turn = game.turn;
  game.endTurn();
  for (let i = 0; i < 1500 && game.turn === turn && game.phase !== "over"; i++)
    game.tick();
}

describe("release match rules", () => {
  it("spawns eight supported worms on 64 reproducible fields", () => {
    for (let seed = 1; seed <= 64; seed++) {
      const game = new Game(seed);
      expect(game.worms).toHaveLength(8);
      for (const w of game.worms) {
        expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
        expect(game.terrain.bodyCollides(w.x, w.y + 2)).toBe(true);
        expect(w.y).toBeLessThan(game.water - 100);
      }
      expect(game.worms[0].x).toBeGreaterThanOrEqual(180);
      expect(game.worms[7].x).toBeLessThanOrEqual(1420);
    }
  });
  it("cycles every surviving worm once after eliminations", () => {
    const game = new Game(19);
    game.worms[0].hp = 0;
    game.worms[4].hp = 0;
    const order: number[] = [];
    for (let i = 0; i < 12; i++) {
      advanceTurn(game);
      order.push(game.activeId);
    }
    expect(order).toEqual([5, 1, 6, 2, 7, 3, 5, 1, 6, 2, 7, 3]);
  });
  it("starts rising water after round 16 and idle matches reach an ending", () => {
    const game = new Game(21);
    for (let i = 0; i < 30; i++) advanceTurn(game);
    expect(game.round).toBe(16);
    expect(game.water).toBe(802);
    advanceTurn(game);
    advanceTurn(game);
    expect(game.round).toBe(17);
    expect(game.water).toBe(778);
    for (let i = 0; i < 100 && game.phase !== "over"; i++) advanceTurn(game);
    expect(game.phase).toBe("over");
  });
  it("practice has no turn clock, resets casualties and preserves unlimited stock", () => {
    const game = new Game(18, { mode: "practice", teamSize: 2 });
    for (let i = 0; i < 2800; i++) game.tick();
    expect(game.phase).toBe("aim");
    expect(game.turnTicks).toBe(2700);
    game.worms[2].hp = 0;
    advanceTurn(game);
    expect(game.active.team).toBe(0);
    expect(game.worms[2].hp).toBe(100);
    expect(game.inventory[0].airstrike).toBe(-1);
    expect(() => encodeSave(game, "garden")).toThrow();
  });
});

describe("recoverable saves", () => {
  it("restores exact terrain, names, inventory, rotations and future random draws", () => {
    const game = new Game(432, { names: [["<b>Pip</b>"]] });
    game.terrain.carve(500, 540, 83);
    advanceTurn(game);
    advanceTurn(game);
    const encoded = encodeSave(game, "frost");
    expect(encoded.length).toBeLessThan(30000);
    const restored = decodeSave(encoded);
    expect(restored.theme).toBe("frost");
    expectSameSnapshot(restored.game.snapshot(), game.snapshot());
    expect(restored.game.random()).toBe(game.random());
    advanceTurn(game);
    advanceTurn(restored.game);
    expectSameSnapshot(restored.game.snapshot(), game.snapshot());
  });
  it.each(["rocket", "cluster", "dynamite", "airstrike"] as const)(
    "resumes an in-flight %s snapshot deterministically",
    (weapon) => {
      const game = new Game(34);
      expect(game.attack(weapon, -0.7, 0.6, { x: 1100, y: 400 })).toBe(true);
      for (let i = 0; i < 80; i++) game.tick();
      const restored = Game.restore(game.snapshot());
      for (let i = 0; i < 600; i++) {
        game.tick();
        restored.tick();
      }
      expectSameSnapshot(restored.snapshot(), game.snapshot());
    },
  );
  it("rejects truncated, oversized, invalid and incompatible data", () => {
    const valid = JSON.parse(encodeSave(new Game(12), "garden"));
    for (const modify of [
      (d: any) => {
        d.schema = 99;
      },
      (d: any) => {
        d.snapshot.terrain.cells = [5];
      },
      (d: any) => {
        d.snapshot.terrain.cells = [99999999];
      },
      (d: any) => {
        d.snapshot.worms[0].hp = -1;
      },
      (d: any) => {
        d.snapshot.activeId = 6;
      },
      (d: any) => {
        d.snapshot.inventory[0].rocket = 9999;
      },
      (d: any) => {
        d.snapshot.rotations[0] = 3;
      },
    ]) {
      const changed = structuredClone(valid);
      modify(changed);
      expect(() => decodeSave(JSON.stringify(changed))).toThrow();
    }
    expect(() => decodeSave(" ".repeat(4_000_001))).toThrow();
    expect(() => decodeSave('{"schema":')).toThrow();
  });
  it("does not restore injected instance methods", () => {
    const data = JSON.parse(encodeSave(new Game(12), "canyon"));
    data.snapshot.tick = "replace method";
    data.snapshot.__proto__ = { compromised: true };
    expect(typeof decodeSave(JSON.stringify(data)).game.tick).toBe("function");
  });
});

describe("background planning lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("transfers a terrain copy and rejects replies after replacement or mutation", () => {
    const workers: any[] = [];
    class FakeWorker {
      onmessage: any;
      onerror: any;
      terminate = vi.fn();
      postMessage = vi.fn();
      constructor() {
        workers.push(this);
      }
    }
    vi.stubGlobal("Worker", FakeWorker);
    const game = new Game(18),
      planner = new BackgroundPlanner();
    const result = vi.fn(),
      failure = vi.fn();
    planner.start(game, result, failure);
    const first = workers[0],
      message = first.postMessage.mock.calls[0][0];
    expect(message.snapshot.terrain.cells.buffer).not.toBe(
      game.terrain.cells.buffer,
    );
    planner.start(game, result, failure);
    first.onmessage({ data: { id: message.id, plan: {}, done: true } });
    expect(result).not.toHaveBeenCalled();
    expect(first.terminate).toHaveBeenCalled();
    const second = workers[1],
      secondMessage = second.postMessage.mock.calls[0][0];
    game.terrain.revision++;
    second.onmessage({ data: { id: secondMessage.id, plan: {}, done: true } });
    expect(result).not.toHaveBeenCalled();
    expect(second.terminate).toHaveBeenCalled();
    expect(failure).toHaveBeenCalledOnce();
  });
  it("falls back if workers cannot start", () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("unavailable");
        }
      },
    );
    const failure = vi.fn();
    new BackgroundPlanner().start(new Game(1), vi.fn(), failure);
    expect(failure).toHaveBeenCalledOnce();
  });
});

it("rejects duplicate, reserved or incomplete saved keyboard bindings", () => {
  for (const invalid of [
    null,
    {},
    { ...DEFAULT_BINDINGS, fire: "Escape" },
    { ...DEFAULT_BINDINGS, fire: "KeyA" },
  ])
    expect(readBindings(invalid)).toEqual(DEFAULT_BINDINGS);
  expect(readBindings({ ...DEFAULT_BINDINGS, fire: "KeyZ" }).fire).toBe("KeyZ");
});
