import { describe, it, expect } from "vitest";
import {
  Game,
  traceWeapon,
  planShots,
  simulateShot,
  GameEvent,
} from "../src/game/simulation";
import { Terrain, INITIAL_WATER } from "../src/game/terrain";
import { WEAPON_IDS, WEAPONS } from "../src/game/weapons";
import { planMovement, previewRoute, executeMove } from "../src/game/ai";
import { chatterEvent, chatterKey, BANTER } from "../src/banter";

function field(): Game {
  const g = new Game(7);
  g.terrain = new Terrain();
  g.terrain.rectangle(0, 600, 1600, 260, 1);
  g.wind = 0;
  g.worms.forEach((w, i) =>
    Object.assign(w, {
      x: [200, 500, 900, 1300][i],
      y: 600,
      vx: 0,
      vy: 0,
      grounded: true,
      fallStart: 600,
    }),
  );
  return g;
}
function finishTurn(g: Game): void {
  for (let i = 0; i < 1400 && g.turn === 0 && g.phase !== "over"; i++) g.tick();
}

describe("varied seeded battlefields", () => {
  it("builds four distinct silhouettes with safe supported spawns across 64 seeds", () => {
    const layouts = new Set<string>(),
      runs = new Set<number>();
    for (let seed = 1; seed <= 64; seed++) {
      const g = new Game(seed);
      layouts.add(g.terrain.layout);
      let last = false,
        count = 0;
      for (let x = 0; x < 1600; x++) {
        const land = g.terrain.surface(x) < INITIAL_WATER;
        if (land && !last) count++;
        last = land;
      }
      runs.add(count);
      for (const w of g.worms) {
        expect(g.terrain.bodyCollides(w.x, w.y), `seed ${seed}`).toBe(false);
        expect(
          g.terrain.bodyCollides(w.x, w.y + 3),
          `support seed ${seed}`,
        ).toBe(true);
        expect(w.y).toBeLessThan(INITIAL_WATER - 100);
      }
    }
    expect(layouts.size).toBe(4);
    expect(runs.size).toBeGreaterThanOrEqual(3);
  });
});

describe("expanded arsenal", () => {
  it("defines 12 distinct items with independent squad inventories", () => {
    const g = field();
    expect(WEAPON_IDS).toHaveLength(12);
    for (const id of WEAPON_IDS)
      expect(g.inventory[0][id]).toBe(WEAPONS[id].ammo);
    g.inventory[0].mortar = 0;
    expect(g.inventory[1].mortar).toBe(3);
  });
  it("rifle is stopped by one pixel of terrain or the first friendly worm", () => {
    const g = field();
    g.worms[2].x = 350;
    g.terrain.rectangle(270, 550, 1, 50, 1);
    const hit = traceWeapon(g, g.active, "sniper", 0)[0];
    expect(hit.soil).toBe(true);
    expect(hit.x).toBeLessThan(271);
    g.terrain.carve(270, 580, 50);
    g.worms[1].x = 285;
    expect(g.attack("sniper", 0)).toBe(true);
    expect(g.worms[1].hp).toBe(58);
    expect(g.worms[2].hp).toBe(100);
    expect(g.inventory[0].sniper).toBe(2);
    expect(g.attack("sniper", 0)).toBe(false);
  });
  it("shotgun spreads five finite rays with distance falloff and no penetration", () => {
    const g = field();
    g.worms[2].x = 250;
    g.worms[3].x = 300;
    const rays = traceWeapon(g, g.active, "shotgun", 0);
    expect(rays).toHaveLength(5);
    expect(rays.every((r) => r.actor === 2)).toBe(true);
    g.attack("shotgun", 0);
    expect(g.worms[2].hp).toBeGreaterThanOrEqual(40);
    expect(g.worms[2].hp).toBeLessThan(50);
    expect(g.worms[3].hp).toBe(100);
    const far = field();
    far.worms[2].x = 700;
    far.worms[1].x = 850;
    expect(
      traceWeapon(far, far.active, "shotgun", 0).every(
        (r) => r.actor === undefined,
      ),
    ).toBe(true);
  });
  it("cluster splits into five timed fragments and waits for all to resolve", () => {
    const g = field();
    expect(g.attack("cluster", -0.6, 0.5)).toBe(true);
    for (let i = 0; i < 180; i++) g.tick();
    expect(g.projectiles).toHaveLength(5);
    expect(g.projectiles.every((p) => p.kind === "fragment")).toBe(true);
    expect(g.turn).toBe(0);
    finishTurn(g);
    expect(g.projectiles).toHaveLength(0);
    expect(g.stats.craters).toBe(6);
  });
  it("TNT has a four-second fuse and can be escaped", () => {
    const g = field();
    g.attack("dynamite", 0);
    for (let i = 0; i < 239; i++) {
      g.move(-1);
      g.tick();
    }
    expect(g.projectiles).toHaveLength(1);
    expect(g.events.filter((e) => e.type === "blast")).toHaveLength(0);
    g.tick();
    expect(g.projectiles).toHaveLength(0);
    expect(g.events.filter((e) => e.type === "blast")).toHaveLength(1);
    expect(g.active.hp).toBe(100);
  });
  it("airstrike spends one stock, spawns five shells, and respects roofs", () => {
    const g = field();
    expect(g.attack("airstrike", 0, 1, { x: -1, y: 400 })).toBe(false);
    expect(g.inventory[0].airstrike).toBe(1);
    g.terrain.rectangle(680, 300, 400, 30, 1);
    expect(g.attack("airstrike", 0, 1, { x: 850, y: 500 })).toBe(true);
    expect(g.projectiles).toHaveLength(5);
    expect(g.inventory[0].airstrike).toBe(0);
    finishTurn(g);
    expect(g.projectiles).toHaveLength(0);
    expect(g.stats.craters).toBe(5);
    expect(g.worms[2].hp).toBe(100);
  });
  it("mortar and cluster flights use exactly the live trajectory", () => {
    for (const kind of ["mortar", "cluster"] as const) {
      const g = field(),
        predicted = simulateShot(g, -0.85, 0.82, kind);
      g.attack(kind, -0.85, 0.82);
      for (let i = 0; i < predicted.ticks; i++) g.tick();
      const blast = g.events.find((e) => e.type === "blast")!;
      expect(blast.x).toBeCloseTo(predicted.x, 3);
      expect(blast.y).toBeCloseTo(predicted.y, 3);
    }
  });
  it("teleport validates footing, distance, water, soil, and worm overlap atomically", () => {
    const g = field();
    const start = { x: g.active.x, y: g.active.y };
    for (const target of [
      { x: -3, y: 600 },
      { x: 250, y: 780 },
      { x: 1100, y: 600 },
      { x: 500, y: 600 },
      { x: 300, y: 740 },
      { x: NaN, y: 600 },
    ]) {
      expect(g.attack("teleport", 0, 1, target)).toBe(false);
      expect(g.inventory[0].teleport).toBe(2);
      expect(g.phase).toBe("aim");
      expect({ x: g.active.x, y: g.active.y }).toEqual(start);
    }
    expect(g.attack("teleport", 0, 1, { x: 380, y: 590 })).toBe(true);
    expect(g.active.x).toBe(380);
    expect(g.active.y).toBe(600);
    expect(g.active.grounded).toBe(true);
  });
  it("healing rejects a full-health worm and caps at100 while consuming an action", () => {
    const g = field();
    expect(g.attack("medkit", 0)).toBe(false);
    expect(g.inventory[0].medkit).toBe(1);
    g.active.hp = 82;
    expect(g.attack("medkit", 0)).toBe(true);
    expect(g.active.hp).toBe(100);
    expect(g.inventory[0].medkit).toBe(0);
    expect(g.phase).toBe("retreat");
  });
  it("AI excludes exhausted equipment and can choose a clean rifle shot", () => {
    const g = field();
    g.worms[2].x = 350;
    for (const id of WEAPON_IDS) g.inventory[0][id] = 0;
    g.inventory[0].sniper = 1;
    let best;
    for (const candidate of planShots(g)) best = candidate;
    // With no ballistic candidates, the final return still carries the rifle plan.
    const planner = planShots(g);
    let item = planner.next();
    while (!item.done) item = planner.next();
    expect(item.value.weapon).toBe("sniper");
    expect(item.value.score).toBe(42);
  });
});

describe("purposeful movement", () => {
  it("plans visible separation without mutating the live simulation", () => {
    const g = field();
    g.worms[1].x = 245;
    g.worms[2].x = 800;
    const before = JSON.stringify({
      worms: g.worms,
      events: g.events,
      stats: g.stats,
      inventory: g.inventory,
    });
    const revision = g.terrain.revision;
    const route = planMovement(g);
    expect(
      JSON.stringify({
        worms: g.worms,
        events: g.events,
        stats: g.stats,
        inventory: g.inventory,
      }),
    ).toBe(before);
    expect(g.terrain.revision).toBe(revision);
    expect(route.commands.length).toBeGreaterThan(0);
    expect(Math.abs(route.x - g.active.x)).toBeGreaterThan(20);
    for (const command of route.commands) {
      executeMove(g, command);
      g.tick();
    }
    expect(g.active.hp).toBe(100);
    expect(g.active.grounded).toBe(true);
    expect(g.active.x).toBeCloseTo(route.x, 1);
  });
  it("stops a walking route at the edge of a deep gap", () => {
    const g = field();
    g.terrain.carve(275, 730, 144);
    const commands = Array.from({ length: 160 }, () => ({ direction: 1 }));
    const preview = previewRoute(g, commands);
    expect(preview).not.toBeNull();
    expect(preview!.x).toBeLessThan(214);
    for (const command of commands) {
      executeMove(g, command);
      g.tick();
    }
    expect(g.active.hp).toBe(100);
    expect(g.active.x).toBeCloseTo(preview!.x, 2);
  });
  it("can preview and execute a hop onto a low ledge", () => {
    const g = field();
    g.terrain.rectangle(236, 574, 120, 26, 1);
    const commands = Array.from({ length: 165 }, (_, i) => ({
      direction: i < 100 ? 1 : 0,
      jump: i === 6,
    }));
    const route = previewRoute(g, commands);
    expect(route).not.toBeNull();
    expect(route!.x).toBeGreaterThan(265);
    expect(route!.y).toBeLessThan(600);
    for (const command of commands) {
      executeMove(g, command);
      g.tick();
    }
    expect(g.active.x).toBeCloseTo(route!.x, 1);
    expect(g.active.hp).toBe(100);
  });
});

describe("event-driven personality", () => {
  it("walking emits spaced movement sounds and landing emits an impact", () => {
    const g = field();
    for (let i = 0; i < 60; i++) {
      g.move(1);
      g.tick();
    }
    const steps = g.events.filter((e) => e.type === "step");
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThan(8);
    g.events = [];
    g.jump();
    for (let i = 0; i < 100; i++) g.tick();
    expect(g.events.some((e) => e.type === "land")).toBe(true);
  });
  it("reports a miss, hit, friendly fire and skipped action accurately", () => {
    for (const scenario of ["miss", "hit", "friendly", "skip"] as const) {
      const g = field();
      if (scenario === "skip") g.endTurn();
      else {
        if (scenario === "hit") g.worms[2].x = 290;
        if (scenario === "friendly") g.worms[1].x = 290;
        g.attack("sniper", scenario === "miss" ? -Math.PI / 2 : 0);
      }
      finishTurn(g);
      expect(g.events.find((e) => e.type === "outcome")?.outcome).toBe(
        scenario,
      );
    }
  });
  it("prioritizes outcomes over turn greetings and covers every outcome", () => {
    const events: GameEvent[] = [
      { type: "turn", x: 0, y: 0 },
      { type: "outcome", x: 0, y: 0, outcome: "miss" },
    ];
    expect(chatterKey(chatterEvent(events)!)).toBe("miss");
    for (const key of [
      "turn",
      "hit",
      "miss",
      "friendly",
      "skip",
      "utility",
      "heal",
    ])
      expect(BANTER[key].length).toBeGreaterThan(2);
  });
});

describe("AI review regressions", () => {
  it("uses the same ledge guards in planning and execution, including under a ceiling", () => {
    for (const ceiling of [false, true]) {
      const g = field();
      g.terrain = new Terrain();
      g.terrain.rectangle(0, 600, 240, 260, 1);
      g.terrain.rectangle(240, 650, 1360, 210, 1);
      if (ceiling) g.terrain.rectangle(175, 558, 140, 6, 1);
      g.worms[1].y = g.worms[2].y = g.worms[3].y = 650;
      const route = planMovement(g);
      for (const command of route.commands) {
        executeMove(g, command);
        g.tick();
      }
      expect(g.active.x).toBeCloseTo(route.x, 1);
      expect(g.active.y).toBeCloseTo(route.y, 1);
      expect(g.active.hp).toBe(100);
    }
  });
  it("does not replace a lethal shove with lower-value healing", () => {
    const g = field();
    g.active.hp = 20;
    g.worms[2].x = 245;
    g.worms[2].hp = 10;
    for (const id of WEAPON_IDS) g.inventory[0][id] = 0;
    g.inventory[0].shove = 1;
    g.inventory[0].medkit = 1;
    const planner = planShots(g);
    let item = planner.next();
    while (!item.done) item = planner.next();
    expect(item.value.weapon).toBe("shove");
  });
});

describe("reaction lifecycle", () => {
  it("does not make an eliminated outgoing worm speak, and still hands over the turn", () => {
    const g = field();
    const actor = g.activeId;
    g.attack("sniper", -Math.PI / 2);
    g.damage(g.active, 100);
    finishTurn(g);
    expect(
      g.events.some((e) => e.type === "outcome" && e.actor === actor),
    ).toBe(false);
    expect(
      g.events.some((e) => e.type === "turn" && e.actor === g.activeId),
    ).toBe(true);
    expect(g.turn).toBe(1);
  });
  it("still produces the result when the eliminated actor was the last team member", () => {
    const g = field();
    g.worms[1].hp = 0;
    g.endTurn();
    g.damage(g.active, 100);
    finishTurn(g);
    expect(g.events.some((e) => e.type === "outcome")).toBe(false);
    expect(g.phase).toBe("over");
    expect(g.events.some((e) => e.type === "result" && e.value === 1)).toBe(
      true,
    );
  });
});
