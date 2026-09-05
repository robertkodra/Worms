import { describe, it, expect } from "vitest";
import {
  Game,
  TURN_TICKS,
  RETREAT_TICKS,
  createProjectile,
  advanceProjectile,
  planShots,
  simulateShot,
  shoveTargets,
} from "../src/game/simulation";
import { Terrain, INITIAL_WATER } from "../src/game/terrain";

function flatGame(): Game {
  const g = new Game(77);
  g.terrain = new Terrain();
  g.terrain.rectangle(0, 600, 1600, 260, 1);
  g.worms.forEach((w, i) => {
    w.x = 200 + i * 300;
    w.y = 600;
    w.vx = 0;
    w.vy = 0;
    w.grounded = true;
    w.fallStart = 600;
  });
  g.wind = 0;
  return g;
}
function ticks(g: Game, n: number): void {
  for (let i = 0; i < n; i++) g.tick();
}

describe("terrain is the authoritative collision and destruction map", () => {
  it("generates identical playable terrain and supported spawns from a seed", () => {
    const a = new Game(41823),
      b = new Game(41823);
    expect(a.terrain.cells).toEqual(b.terrain.cells);
    for (const w of a.worms) {
      expect(a.terrain.bodyCollides(w.x, w.y)).toBe(false);
      expect(a.terrain.bodyCollides(w.x, w.y + 3)).toBe(true);
      expect(w.y).toBeLessThan(INITIAL_WATER - 100);
    }
    expect(a.terrain.solid(435, 685)).toBe(false);
    expect(a.terrain.solid(435, 605)).toBe(true);
  });
  it("carves clipped circles, preserves untouched cells, and subtracts idempotently", () => {
    const t = new Terrain(100, 100);
    t.rectangle(0, 0, 100, 100, 1);
    const n = t.carve(4, 4, 12);
    expect(n).toBeGreaterThan(0);
    expect(t.solid(4, 4)).toBe(false);
    expect(t.solid(30, 30)).toBe(true);
    expect(t.carve(4, 4, 12)).toBe(0);
    t.carve(50, 50, 10);
    expect(t.solid(50, 50)).toBe(false);
    expect(t.solid(50, 35)).toBe(true);
  });
});

describe("worm movement", () => {
  it("walks on a flat floor without sinking or climbing a tall wall", () => {
    const g = flatGame();
    g.terrain.rectangle(250, 530, 10, 70, 1);
    for (let i = 0; i < 120; i++) {
      g.move(1);
      g.tick();
    }
    expect(g.active.x).toBeGreaterThan(220);
    expect(g.active.x).toBeLessThan(250);
    expect(g.active.y).toBeGreaterThan(595);
    expect(g.terrain.bodyCollides(g.active.x, g.active.y)).toBe(false);
  });
  it("does not steer in the air and settles before changing turns at a jump apex", () => {
    const g = flatGame();
    const original = g.active.id;
    expect(g.jump(true)).toBe(true);
    const vx = g.active.vx;
    g.move(1);
    expect(g.active.vx).toBe(vx);
    g.endTurn();
    ticks(g, 35);
    expect(g.active.id).toBe(original);
    expect(g.active.grounded).toBe(false);
    ticks(g, 100);
    expect(g.turn).toBe(1);
  });
  it("removes support and eliminates a worm that drops into water", () => {
    const g = flatGame();
    const w = g.active;
    g.terrain.carve(w.x, 680, 160);
    ticks(g, 100);
    expect(w.hp).toBe(0);
    expect(g.events.some((e) => e.type === "death" && e.actor === w.id)).toBe(
      true,
    );
  });
  it("applies fall damage once when landing", () => {
    const g = flatGame();
    const w = g.active;
    w.y = 400;
    w.fallStart = 400;
    w.grounded = false;
    ticks(g, 100);
    expect(w.hp).toBeLessThan(100);
    const hp = w.hp;
    ticks(g, 60);
    expect(w.hp).toBe(hp);
  });
});

describe("shots and actions", () => {
  it("sweeps a full-power rocket into a one-cell wall", () => {
    const g = flatGame();
    g.terrain.rectangle(285, 400, 1, 200, 1);
    const p = createProjectile(g.active, "rocket", 0, 1);
    let hit = null;
    for (let i = 0; i < 30 && !hit; i++)
      hit = advanceProjectile(p, g.terrain, g.worms, 0, g.water);
    expect(hit?.hit).toBe(true);
    expect(hit!.x).toBeLessThan(286);
  });
  it("does not spawn a muzzle through adjacent soil", () => {
    const g = flatGame();
    g.terrain.rectangle(213, 555, 1, 45, 1);
    const result = simulateShot(g, 0, 1, "rocket");
    expect(result.hit).toBe(true);
    expect(result.x).toBeLessThan(214);
  });
  it("a resting grenade still detonates on its fuse", () => {
    const g = flatGame();
    const p = createProjectile(g.active, "grenade", -0.3, 0.4);
    p.resting = true;
    p.x = 400;
    p.y = 596;
    for (let i = 0; i < 179; i++)
      expect(advanceProjectile(p, g.terrain, g.worms, 0, g.water)).toBeNull();
    expect(advanceProjectile(p, g.terrain, g.worms, 0, g.water)?.hit).toBe(
      true,
    );
  });
  it("uses the same trajectory in planning and actual play", () => {
    const g = flatGame();
    const predicted = simulateShot(g, -0.6, 0.8, "rocket");
    expect(g.attack("rocket", -0.6, 0.8)).toBe(true);
    for (let i = 0; i < 721 && g.projectile; i++) g.tick();
    const blast = g.events.find((e) => e.type === "blast");
    expect(blast).toBeDefined();
    expect(blast!.x).toBeCloseTo(predicted.x, 3);
    expect(blast!.y).toBeCloseTo(predicted.y, 3);
  });
  it("does not shove through a one-cell wall, and the planner rejects that shove", () => {
    const g = flatGame();
    g.worms[2].x = 250;
    g.worms[2].hp = 15;
    g.terrain.rectangle(227, 555, 1, 45, 1);
    expect(shoveTargets(g, g.active, 1)).toHaveLength(0);
    let plan;
    for (const candidate of planShots(g)) plan = candidate;
    expect(plan!.weapon).not.toBe("shove");
    g.attack("shove", 0);
    expect(g.worms[2].hp).toBe(15);
  });
  it("validates bridge placement before consuming stock and carves bridges like soil", () => {
    const g = flatGame();
    const initial = g.inventory[0].bridge;
    expect(g.attack("bridge", 0, 1, { x: 220, y: 620 })).toBe(false);
    expect(g.inventory[0].bridge).toBe(initial);
    expect(g.phase).toBe("aim");
    expect(g.attack("bridge", 0, 1, { x: 268, y: 565 })).toBe(true);
    expect(g.inventory[0].bridge).toBe(initial - 1);
    expect(g.terrain.solid(268, 567)).toBe(true);
    g.terrain.carve(268, 567, 12);
    expect(g.terrain.solid(268, 567)).toBe(false);
    expect(g.attack("rocket", -0.5, 1)).toBe(false);
  });
  it("applies friendly fire and self damage as well as terrain destruction", () => {
    const g = flatGame();
    const before = g.terrain.revision;
    g.worms[1].x = g.active.x + 30;
    g.explode(g.active.x + 15, g.active.y - 15, "rocket");
    expect(g.active.hp).toBeLessThan(100);
    expect(g.worms[1].hp).toBeLessThan(100);
    expect(g.terrain.revision).toBeGreaterThan(before);
  });
});

describe("match progression", () => {
  it("times out an unused turn and rejects a second attack during retreat", () => {
    const g = flatGame();
    ticks(g, TURN_TICKS + 32);
    expect(g.turn).toBe(1);
    expect(g.phase).toBe("aim");
    expect(g.attack("rocket", -2.3, 0.5)).toBe(true);
    expect(g.attack("grenade", -2.3, 0.5)).toBe(false);
    expect(g.retreatTicks).toBe(RETREAT_TICKS);
  });
  it("declares a draw for simultaneous final eliminations", () => {
    const g = flatGame();
    g.worms.forEach((w) => g.damage(w, 100));
    g.endTurn();
    ticks(g, 60);
    expect(g.phase).toBe("over");
    expect(g.winner).toBe(-1);
    const turn = g.turn;
    ticks(g, 100);
    expect(g.turn).toBe(turn);
  });
  it("skips dead actors in rotation and declares a team victory", () => {
    const g = flatGame();
    g.damage(g.worms[2], 100);
    g.endTurn();
    ticks(g, 60);
    expect(g.active.id).toBe(3);
    g.damage(g.worms[3], 100);
    g.endTurn();
    ticks(g, 60);
    expect(g.winner).toBe(0);
  });
  it("replays a seeded command sequence identically", () => {
    const a = flatGame(),
      b = flatGame();
    for (const g of [a, b]) {
      for (let i = 0; i < 40; i++) {
        g.move(1);
        g.tick();
      }
      g.jump();
      ticks(g, 80);
      g.attack("grenade", -0.6, 0.7);
      ticks(g, 600);
    }
    expect(a.worms).toEqual(b.worms);
    expect(a.terrain.cells).toEqual(b.terrain.cells);
    expect(a.turn).toBe(b.turn);
  });
  it("finishes complete 2v2 AI matches with finite state", () => {
    for (const seed of [41823, 7, 934]) {
      const g = new Game(seed);
      let simulated = 0;
      while (g.phase !== "over" && simulated < 90000) {
        if (g.phase === "aim") {
          let plan;
          for (const candidate of planShots(g)) plan = candidate;
          if (plan) g.attack(plan.weapon, plan.angle, plan.power, plan.target);
          else g.endTurn();
        }
        g.tick();
        simulated++;
        for (const w of g.worms)
          expect([w.x, w.y, w.vx, w.vy, w.hp].every(Number.isFinite)).toBe(
            true,
          );
      }
      expect(g.phase, `seed ${seed} stalled after ${g.turn} turns`).toBe(
        "over",
      );
      expect(g.winner).not.toBeNull();
      expect(g.stats.shots).toBeGreaterThan(4);
    }
  }, 30000);
});
