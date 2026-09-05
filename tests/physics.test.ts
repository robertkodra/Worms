import { describe, it, expect } from "vitest";
import {
  Game,
  advanceProjectile,
  createProjectile,
} from "../src/game/simulation";
import { Terrain } from "../src/game/terrain";

function flat(y = 600): Game {
  const game = new Game(1, { teamSize: 2 });
  game.terrain = new Terrain();
  game.terrain.rectangle(0, y, 1600, 900 - y, 1);
  game.worms.forEach((w, i) =>
    Object.assign(w, {
      x: 160 + i * 350,
      y,
      vx: 0,
      vy: 0,
      grounded: true,
      fallStart: y,
    }),
  );
  game.wind = 0;
  return game;
}
function ramp(slope: number): Game {
  const game = flat();
  for (let x = 200; x < 1500; x++)
    game.terrain.rectangle(
      x,
      Math.max(300, 600 - (x - 200) * slope),
      1,
      600,
      1,
    );
  return game;
}

describe("ground contact and slope limits", () => {
  it("keeps valid footing beneath a low ceiling", () => {
    const game = flat(),
      w = game.active;
    game.terrain.rectangle(80, 560, 600, 12, 1);
    for (let i = 0; i < 90; i++) {
      game.move(1);
      game.advanceWorm(w);
    }
    expect(w.grounded).toBe(true);
    expect(w.x).toBeGreaterThan(220);
    expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
  });
  it("slides down the screenshot's crater side instead of landing on the wall", () => {
    const game = flat(500),
      w = game.active;
    game.terrain.carve(300, 505, 100);
    Object.assign(w, { x: 390, y: 455, grounded: false, fallStart: 455 });
    for (let i = 0; i < 300; i++) game.advanceWorm(w);
    expect(w.x).toBeLessThan(370);
    expect(w.y).toBeGreaterThan(565);
    expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
    expect(w.grounded).toBe(true);
  });
  it("cannot walk up a nearly vertical 76-degree ramp", () => {
    const game = ramp(4),
      w = game.active;
    for (let i = 0; i < 180; i++) {
      game.move(1);
      game.advanceWorm(w);
    }
    expect(w.y).toBeGreaterThan(570);
    expect(w.x).toBeLessThan(215);
    expect(game.terrain.bodyCollides(w.x, w.y)).toBe(false);
  });
  it("keeps gentle slopes traversable and does not invent fall damage", () => {
    const game = ramp(0.5),
      w = game.active;
    for (let i = 0; i < 180; i++) {
      game.move(1);
      game.advanceWorm(w);
    }
    expect(w.x).toBeGreaterThan(285);
    expect(w.y).toBeLessThan(565);
    expect(w.hp).toBe(100);
    expect(w.grounded).toBe(true);
  });
  it("measures falls from the apex and emits impact strength", () => {
    const game = flat(),
      w = game.active;
    Object.assign(w, {
      x: 160,
      y: 400,
      vy: -217,
      grounded: false,
      fallStart: 400,
    });
    let peak = w.y;
    for (let i = 0; i < 400 && !w.grounded; i++) {
      game.advanceWorm(w);
      peak = Math.min(peak, w.y);
    }
    expect(w.grounded).toBe(true);
    expect(100 - w.hp).toBe(Math.round((w.y - peak - 115) * 0.16));
    expect(game.events.find((e) => e.type === "land")?.value).toBeGreaterThan(
      300,
    );
  });
});

describe("grenade contact response", () => {
  it("bounces away from a worm instead of hanging against its side", () => {
    const game = flat();
    Object.assign(game.worms[1], { x: 500, y: 600 });
    const p = createProjectile(game.active, "grenade", 0, 1);
    Object.assign(p, { x: 485, y: 582, vx: 150, vy: 0, clearedOwner: true });
    for (let i = 0; i < 12; i++)
      advanceProjectile(p, game.terrain, game.worms, 0, game.water);
    expect(p.vx).toBeLessThan(0);
    expect(p.x).toBeLessThan(485);
    expect(p.resting).toBe(false);
  });
  it("retains motion after a fast shallow impact", () => {
    const game = flat();
    const p = createProjectile(game.active, "grenade", 0, 1);
    Object.assign(p, { x: 350, y: 596.8, vx: 400, vy: 0, clearedOwner: true });
    advanceProjectile(p, game.terrain, [], 0, game.water);
    expect(p.vx).toBeGreaterThan(250);
    expect(p.resting).toBe(false);
    for (let i = 0; i < 20; i++)
      advanceProjectile(p, game.terrain, [], 0, game.water);
    expect(p.x).toBeGreaterThan(365);
  });
  it("reports audible bounces without changing preview trajectories", () => {
    const game = flat(),
      p = createProjectile(game.active, "grenade", 0, 1);
    Object.assign(p, { x: 350, y: 570, vx: 100, vy: 160, clearedOwner: true });
    const preview = structuredClone(p),
      events: any[] = [];
    for (let i = 0; i < 30; i++) {
      advanceProjectile(p, game.terrain, [], 0, game.water, events);
      advanceProjectile(preview, game.terrain, [], 0, game.water);
    }
    expect(p).toEqual(preview);
    expect(events.some((e) => e.type === "bounce" && e.value > 28)).toBe(true);
  });
});

describe("radial explosion impulse", () => {
  it("preserves an existing fall apex when another blast adds momentum", () => {
    const game = flat(),
      w = game.active;
    Object.assign(w, {
      x: 500,
      y: 400,
      vx: 0,
      vy: 120,
      grounded: false,
      fallStart: 200,
    });
    game.explode(590, 386, "rocket");
    expect(w.fallStart).toBe(200);
    const hpAfterBlast = w.hp;
    for (let i = 0; i < 400 && !w.grounded; i++) game.advanceWorm(w);
    expect(w.grounded).toBe(true);
    expect(hpAfterBlast - w.hp).toBeGreaterThan(40);
  });
  it("pushes an airborne worm away from a blast overhead without inventing a horizontal direction", () => {
    const game = flat(),
      w = game.active;
    Object.assign(w, { x: 500, y: 400, vx: 0, vy: 120, grounded: false });
    game.explode(500, 346, "rocket");
    expect(w.vx).toBe(0);
    expect(w.vy).toBeGreaterThan(120);
  });
  it("does not launch a zero-damage graze with a fixed minimum force", () => {
    const game = flat(),
      w = game.active;
    game.explode(w.x - 94.9, w.y - 14, "rocket");
    expect(w.hp).toBe(100);
    expect(Math.hypot(w.vx, w.vy)).toBeLessThan(1);
  });
});
