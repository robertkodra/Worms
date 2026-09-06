import { describe, expect, it } from "vitest";
import {
  advanceProjectile,
  createProjectile,
  Game,
  GameEvent,
} from "../src/game/simulation";
import { Terrain, SEABED_Y } from "../src/game/terrain";
import { decodeSave, encodeSave } from "../src/game/save";
import { advanceSinkingBody, sinkingBody } from "../src/render/sinking";

function waterGame(): Game {
  const game = new Game(34, { teamSize: 2 });
  const spawns = game.terrain.spawnPoints;
  game.terrain = new Terrain();
  game.terrain.spawnPoints = spawns;
  game.terrain.rectangle(100, 600, 350, 300, 1);
  game.terrain.rectangle(1100, 600, 350, 300, 1);
  game.worms.forEach((w, i) =>
    Object.assign(w, {
      x: i < 2 ? 200 + i * 120 : 1150 + (i - 2) * 120,
      y: 600,
      vx: 0,
      vy: 0,
      grounded: true,
      fallStart: 600,
    }),
  );
  return game;
}

describe("underwater projectiles", () => {
  it("does not splash at the surface again when a submerged cluster creates fragments", () => {
    const game = waterGame(),
      p = createProjectile(game.active, "cluster", 0, 1);
    Object.assign(p, { x: 750, y: 850, fuse: 1, submergedTicks: 10 });
    game.projectile = p;
    game.tick();
    expect(game.projectiles).toHaveLength(5);
    expect(
      game.projectiles.every((fragment) => fragment.submergedTicks > 0),
    ).toBe(true);
    for (let i = 0; i < 10; i++) game.tick();
    expect(game.events.some((e) => e.type === "splash")).toBe(false);
  });
  it.each(["dynamite", "grenade", "cluster"] as const)(
    "keeps the original %s fuse running after a splash and settles on the seabed",
    (kind) => {
      const game = waterGame(),
        p = createProjectile(game.active, kind, 0, 1),
        events: GameEvent[] = [];
      Object.assign(p, { x: 750, y: 800, vx: 0, vy: 180, clearedOwner: true });
      const fuse = p.fuse;
      let result = null;
      for (let i = 1; i <= fuse; i++) {
        result = advanceProjectile(
          p,
          game.terrain,
          game.worms,
          0,
          game.water,
          events,
        );
        expect(p.y).toBeLessThan(SEABED_Y);
        expect(game.terrain.circleCollides(p.x, p.y, 3.2)).toBe(false);
        if (i < fuse) expect(result).toBeNull();
      }
      expect(events.filter((e) => e.type === "splash")).toHaveLength(1);
      expect(result?.hit).toBe(true);
      expect(p.age).toBe(fuse);
      expect(p.y).toBeGreaterThan(game.water + 45);
      if (kind === "dynamite") expect(p.resting).toBe(true);
    },
  );
  it.each(["rocket", "mortar", "airstrike"] as const)(
    "gives %s a short underwater plunge before detonation",
    (kind) => {
      const game = waterGame(),
        p = createProjectile(game.active, kind, Math.PI / 2, 1),
        events: GameEvent[] = [];
      Object.assign(p, {
        x: 750,
        y: 800,
        vx: 150,
        vy: 600,
        clearedOwner: true,
      });
      expect(
        advanceProjectile(p, game.terrain, [], 0, game.water, events),
      ).toBeNull();
      expect(p.submergedTicks).toBe(1);
      expect(p.vy).toBeLessThanOrEqual(90);
      let result = null;
      for (let i = 0; i < 20 && !result; i++)
        result = advanceProjectile(p, game.terrain, [], 0, game.water, events);
      expect(result?.hit).toBe(true);
      expect(result!.y).toBeGreaterThan(game.water + 5);
      expect(p.submergedTicks).toBe(12);
      expect(events.filter((e) => e.type === "splash")).toHaveLength(1);
    },
  );
  it("does not reset a nearly expired fuse when crossing the surface", () => {
    const game = waterGame(),
      p = createProjectile(game.active, "dynamite", 0, 1);
    Object.assign(p, { x: 750, y: 801, vy: 120, fuse: 2 });
    expect(advanceProjectile(p, game.terrain, [], 0, game.water)).toBeNull();
    expect(advanceProjectile(p, game.terrain, [], 0, game.water)?.hit).toBe(
      true,
    );
  });
  it("uses identical water trajectories with and without presentation events", () => {
    const game = waterGame(),
      p = createProjectile(game.active, "grenade", 0, 1);
    Object.assign(p, { x: 650, y: 790, vx: 210, vy: 250 });
    const preview = structuredClone(p),
      events: GameEvent[] = [];
    for (let i = 0; i < 180; i++) {
      expect(
        advanceProjectile(p, game.terrain, [], 32, game.water, events),
      ).toEqual(advanceProjectile(preview, game.terrain, [], 32, game.water));
      expect(p).toEqual(preview);
    }
  });
  it("keeps live underwater fuses and future explosion timing through snapshots", () => {
    const game = waterGame(),
      p = createProjectile(game.active, "dynamite", 0, 1);
    Object.assign(p, { x: 750, y: 810, vy: 30 });
    game.projectile = p;
    game.phase = "retreat";
    for (let i = 0; i < 30; i++) game.tick();
    const restored = Game.restore(game.snapshot());
    game.events = [];
    restored.events = [];
    for (let i = 0; i < 220; i++) {
      game.tick();
      restored.tick();
      expect(restored.projectiles).toEqual(game.projectiles);
      expect(restored.events).toEqual(game.events);
    }
    const blast = game.events.find((e) => e.type === "blast");
    expect(blast?.medium).toBe("water");
    expect(blast?.waterLevel).toBe(game.water);
  });
  it("resolves underwater TNT before the next turn without waiting on corpse animation", () => {
    const game = waterGame(),
      p = createProjectile(game.active, "dynamite", 0, 1);
    Object.assign(p, { x: 750, y: 810, fuse: 200 });
    game.projectile = p;
    game.endTurn();
    for (let i = 0; i < 199; i++) {
      game.tick();
      expect(game.turn).toBe(0);
    }
    for (let i = 0; i < 50 && game.turn === 0; i++) game.tick();
    expect(game.turn).toBe(1);
    expect(game.projectiles).toHaveLength(0);
  });
});

describe("drowning and sinking presentation", () => {
  it("eliminates a falling worm once and retains its drowned marker", () => {
    const game = waterGame(),
      w = game.worms[1];
    Object.assign(w, { x: 750, y: 800, vy: 210, grounded: false });
    for (let i = 0; i < 80; i++) game.advanceWorm(w);
    expect(w.hp).toBe(0);
    expect(w.drowned).toBe(true);
    expect(
      game.events.filter((e) => e.type === "splash" && e.actor === w.id),
    ).toHaveLength(1);
    expect(
      game.events.filter((e) => e.type === "death" && e.medium === "water"),
    ).toHaveLength(1);
    const saved = decodeSave(encodeSave(game, "garden")).game;
    expect(saved.worms[1]).toEqual(w);
  });
  it("keeps ordinary land deaths distinct and supports earlier saves", () => {
    const game = waterGame();
    game.damage(game.worms[1], 100);
    expect(game.worms[1].drowned).toBe(false);
    expect(game.events.find((e) => e.type === "death")?.medium).toBeUndefined();
    const save = JSON.parse(encodeSave(game, "garden"));
    save.snapshot.worms.forEach((w: any) => {
      delete w.drowned;
    });
    expect(
      decodeSave(JSON.stringify(save)).game.worms.every((w) => !w.drowned),
    ).toBe(true);
    save.snapshot.worms[0].drowned = true;
    expect(() => decodeSave(JSON.stringify(save))).toThrow();
  });
  it("sinks gradually, pauses, and leaves a stable body resting on the bed", () => {
    const game = waterGame();
    Object.assign(game.worms[1], { x: 750, y: 809, vy: 210, vx: 90 });
    const body = sinkingBody(game.worms[1]),
      start = body.y;
    advanceSinkingBody(body, game.terrain, 1 / 60);
    expect(body.y).toBeGreaterThan(start);
    expect(body.y).toBeLessThan(start + 1);
    const paused = { ...body };
    for (let i = 0; i < 60; i++) advanceSinkingBody(body, game.terrain, 0);
    expect(body).toEqual(paused);
    for (let i = 0; i < 600; i++)
      advanceSinkingBody(body, game.terrain, 1 / 60);
    expect(body.settled).toBe(true);
    expect(body.y).toBeGreaterThan(SEABED_Y - 10);
    const settled = { x: body.x, y: body.y };
    for (let i = 0; i < 600; i++)
      advanceSinkingBody(body, game.terrain, 1 / 60);
    expect({ x: body.x, y: body.y }).toEqual(settled);
    expect(Math.abs(body.angle)).toBeCloseTo(Math.PI / 2);
  });
  it("rests on underwater terrain and resumes sinking if that support is blasted away", () => {
    const game = waterGame();
    game.terrain.rectangle(650, 850, 200, 50, 1);
    Object.assign(game.worms[1], { x: 750, y: 809, vy: 210 });
    const body = sinkingBody(game.worms[1]);
    for (let i = 0; i < 300; i++)
      advanceSinkingBody(body, game.terrain, 1 / 60);
    expect(body.settled).toBe(true);
    expect(body.y).toBeLessThan(842);
    expect(game.terrain.circleCollides(body.x, body.y, 9)).toBe(false);
    game.terrain.carve(750, 860, 60);
    for (let i = 0; i < 300; i++)
      advanceSinkingBody(body, game.terrain, 1 / 60);
    expect(body.y).toBeGreaterThan(SEABED_Y - 10);
    expect(body.settled).toBe(true);
  });
});
