import { describe, expect, it } from "vitest";
import { Game } from "../src/game/simulation";
import { Terrain } from "../src/game/terrain";
import { executeMove, previewRoute } from "../src/game/ai";
import { decodeSave, encodeSave } from "../src/game/save";
import { JumpBuffer } from "../src/input";

function ledge(height: number, direction = 1, gap = 0): Game {
  const game = new Game(1, { teamSize: 2 });
  const spawnPoints = game.terrain.spawnPoints;
  game.terrain = new Terrain();
  game.terrain.spawnPoints = spawnPoints;
  game.terrain.rectangle(0, 600, 1600, 300, 1);
  game.terrain.rectangle(
    direction > 0 ? 600 : 0,
    600 - height,
    direction > 0 ? 1000 : 600,
    height,
    1,
  );
  Object.assign(game.active, {
    x: 600 - direction * (9.5 + gap),
    y: 600,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: direction,
    fallStart: 600,
  });
  return game;
}

function land(game: Game): void {
  const w = game.active;
  for (let tick = 0; tick < 180 && !w.grounded; tick++) {
    game.advanceWorm(w);
    expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
  }
  expect(w.grounded).toBe(true);
  expect(w.hp).toBe(100);
}

describe("jumping onto small elevations", () => {
  it.each([16, 28, 40])(
    "clears a %i-pixel ledge even when starting against its face",
    (height) => {
      for (const direction of [-1, 1]) {
        for (const gap of [0, 8, 24]) {
          const game = ledge(height, direction, gap);
          expect(game.jump()).toBe(true);
          land(game);
          expect((game.active.x - 600) * direction).toBeGreaterThan(9);
          expect(Math.abs(game.active.y - (600 - height))).toBeLessThan(1);
        }
      }
    },
  );
  it("uses the higher backflip to reach a taller ledge", () => {
    for (const direction of [-1, 1]) {
      const game = ledge(60, direction);
      game.active.facing = -direction;
      game.jump(true);
      land(game);
      expect((game.active.x - 600) * direction).toBeGreaterThan(9);
      expect(Math.abs(game.active.y - 540)).toBeLessThan(1);
    }
  });
  it("cannot jump or repeatedly hop up a wall beyond its reach", () => {
    for (const backflip of [false, true]) {
      const game = ledge(100);
      game.active.facing = backflip ? -1 : 1;
      for (let attempt = 0; attempt < 4; attempt++) {
        game.jump(backflip);
        land(game);
        expect(game.active.x).toBeLessThan(600);
        expect(Math.abs(game.active.y - 600)).toBeLessThan(1);
      }
    }
  });
  it("stops at a low ceiling without slipping into the ledge", () => {
    const game = ledge(40);
    game.terrain.rectangle(500, 545, 250, 10, 1);
    game.jump();
    land(game);
    expect(game.active.x).toBeLessThan(600);
    expect(game.active.jumping).toBe(false);
    expect(Math.abs(game.active.y - 600)).toBeLessThan(1);
  });
  it("lands farther uphill on gentle terrain in both directions", () => {
    for (const direction of [-1, 1]) {
      const game = ledge(0, direction, 40);
      for (let distance = 0; distance < 300; distance++)
        game.terrain.rectangle(
          600 + direction * distance,
          600 - distance * 0.5,
          1,
          300,
          1,
        );
      const start = game.active.x;
      game.jump();
      land(game);
      expect((game.active.x - start) * direction).toBeGreaterThan(70);
      expect(game.active.y).toBeLessThan(590);
    }
  });
  it("keeps launch direction fixed and never allows a second airborne jump", () => {
    const game = ledge(28);
    game.jump();
    const vx = game.active.vx;
    for (let i = 0; i < 10; i++) {
      expect(game.jump(true)).toBe(false);
      game.move(-1);
      game.advanceWorm(game.active);
      expect(game.active.vx).toBe(vx);
    }
    land(game);
  });
  it("does not give blast knockback the voluntary ledge assist", () => {
    const game = ledge(100),
      w = game.active;
    game.jump();
    game.advanceWorm(w);
    game.explode(w.x - 70, w.y + 20, "rocket");
    expect(w.jumping).toBe(false);
    for (let i = 0; i < 8; i++) game.advanceWorm(w);
    expect(w.x).toBeLessThan(600);
    expect(w.vx).toBe(0);
    expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
  });
  it("gives AI route previews the same successful ledge jump as live movement", () => {
    const game = ledge(40);
    game.worms.slice(1).forEach((w) => {
      w.x = 1200;
      w.y = 560;
    });
    const commands = Array.from({ length: 120 }, (_, i) => ({
      direction: i === 0 ? 1 : 0,
      jump: i === 0,
    }));
    const route = previewRoute(game, commands);
    expect(route).not.toBeNull();
    expect(route!.x).toBeGreaterThan(609);
    for (const command of commands) {
      executeMove(game, command);
      game.advanceWorm(game.active);
    }
    expect(game.active.x).toBe(route!.x);
    expect(game.active.y).toBe(route!.y);
  });
  it("preserves a ledge jump through snapshots and saved matches", () => {
    const game = ledge(40);
    game.jump();
    for (let i = 0; i < 4; i++) game.advanceWorm(game.active);
    const restored = Game.restore(game.snapshot());
    const saved = decodeSave(encodeSave(game, "garden")).game;
    for (let i = 0; i < 120; i++) {
      for (const g of [game, restored, saved]) g.advanceWorm(g.active);
      expect(restored.active).toEqual(game.active);
      expect(saved.active).toEqual(game.active);
    }
  });
  it("accepts legacy saves without jump state and rejects malformed jump state", () => {
    const save = JSON.parse(encodeSave(ledge(40), "garden"));
    for (const w of save.snapshot.worms) delete w.jumping;
    expect(decodeSave(JSON.stringify(save)).game.active.jumping).toBe(false);
    save.snapshot.worms[0].jumping = "yes";
    expect(() => decodeSave(JSON.stringify(save))).toThrow();
  });
  it("settles jumps from scattered surface and cave starts without entering terrain", () => {
    for (let seed = 1; seed <= 32; seed++) {
      for (const backflip of [false, true]) {
        const game = new Game(seed);
        for (const w of game.worms) {
          game.activeId = w.id;
          expect(game.jump(backflip)).toBe(true);
          for (let i = 0; i < 240 && w.hp > 0 && !w.grounded; i++) {
            game.advanceWorm(w);
            if (w.hp > 0)
              expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
          }
          expect(w.grounded || w.hp === 0).toBe(true);
          expect(Number.isFinite(w.x + w.y + w.vx + w.vy)).toBe(true);
        }
      }
    }
  });
});

describe("jump input timing", () => {
  it("accepts a tap just before landing once, using the requested movement direction", () => {
    const game = ledge(0),
      w = game.active,
      input = new JumpBuffer();
    Object.assign(w, { y: 598, vy: 70, grounded: false, facing: -1 });
    input.request(game, 1);
    for (let i = 0; i < 120; i++) {
      input.tick(game);
      game.advanceWorm(w);
    }
    expect(game.events.filter((e) => e.type === "jump")).toHaveLength(1);
    expect(w.x).toBeGreaterThan(660);
    expect(w.grounded).toBe(true);
    expect(w.hp).toBe(100);
  });
  it("expires an early tap rather than jumping automatically much later", () => {
    const game = ledge(0),
      input = new JumpBuffer();
    Object.assign(game.active, { y: 550, vy: 0, grounded: false });
    input.request(game, 1);
    for (let i = 0; i < 120; i++) {
      input.tick(game);
      game.advanceWorm(game.active);
    }
    expect(game.active.grounded).toBe(true);
    expect(game.events.some((e) => e.type === "jump")).toBe(false);
  });
  it("discards pending input on pause, match/turn changes, turn end, or damage", () => {
    for (const change of [
      "clear",
      "match",
      "turn",
      "actor",
      "settle",
      "damage",
    ]) {
      let game = ledge(0);
      const input = new JumpBuffer();
      input.request(game, 1);
      if (change === "clear") input.clear();
      if (change === "match") game = ledge(0);
      if (change === "turn") game.turn++;
      if (change === "actor") game.activeId++;
      if (change === "settle") game.endTurn();
      if (change === "damage") game.damage(game.active, 5);
      input.tick(game);
      expect(game.events.some((e) => e.type === "jump")).toBe(false);
    }
  });
  it("retains the backflip modifier while a tap waits for landing", () => {
    const game = ledge(0),
      input = new JumpBuffer();
    input.request(game, 1, true);
    input.tick(game);
    expect(game.active.vx).toBeLessThan(0);
    expect(game.active.vy).toBe(-245);
  });
});
