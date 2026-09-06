import { describe, expect, it } from "vitest";
import { Game } from "../src/game/simulation";
import { decodeSave, encodeSave } from "../src/game/save";
import { executeMove, planMovement } from "../src/game/ai";

describe("scattered surface and cave starts", () => {
  it("gives both crews separated, stable, mixed starts across 256 seeds and both team sizes", () => {
    const signatures = new Set<string>();
    let caveFields = 0;
    for (const teamSize of [2, 4] as const) {
      for (let index = 0; index < 256; index++) {
        const seed = 1 + ((index * 3911) % 999999);
        let g: Game;
        try {
          g = new Game(seed, { teamSize });
        } catch (error) {
          throw new Error(
            `Generation failed for seed ${seed}, size ${teamSize}`,
            { cause: error },
          );
        }
        const points = g.terrain.spawnPoints;
        expect(points).toHaveLength(teamSize * 2);
        const caveCounts = [0, 1].map(
          (team) =>
            points
              .slice(team * teamSize, (team + 1) * teamSize)
              .filter((p) => p.underground).length,
        );
        if (caveCounts[0] > 0) caveFields++;
        expect(caveCounts[0]).toBe(caveCounts[1]);
        const order = [...g.worms].sort((a, b) => a.x - b.x);
        expect(order.at(-1)!.x - order[0].x).toBeGreaterThanOrEqual(1040);
        for (const team of [0, 1]) {
          const xs = g.worms.filter((w) => w.team === team).map((w) => w.x);
          expect(Math.min(...xs)).toBeLessThan(800);
          expect(Math.max(...xs)).toBeGreaterThan(800);
        }
        expect(
          order.slice(1).filter((w, i) => w.team !== order[i].team).length,
        ).toBeGreaterThanOrEqual(teamSize === 4 ? 3 : 2);
        signatures.add(order.map((w) => w.team).join(""));
        for (const w of g.worms) {
          expect(w.team).toBe(Math.floor(w.id / teamSize));
          expect(g.terrain.bodyCollides(w.x, w.y)).toBe(false);
          expect(g.terrain.bodyContact(w.x, w.y)?.y).toBeLessThan(-0.75);
          expect(w.y).toBeLessThan(g.water - 115);
          expect(g.terrain.bodyCollides(w.x, w.y - 12)).toBe(false);
          for (const other of g.worms.filter((o) => o.id !== w.id))
            expect(
              Math.hypot(w.x - other.x, w.y - other.y),
            ).toBeGreaterThanOrEqual(120);
        }
        const positions = g.worms.map((w) => ({ x: w.x, y: w.y }));
        for (let tick = 0; tick < 60; tick++) g.tick();
        for (const w of g.worms) {
          expect(w.hp).toBe(100);
          expect(w.grounded).toBe(true);
          expect(
            Math.hypot(w.x - positions[w.id].x, w.y - positions[w.id].y),
          ).toBeLessThan(1);
        }
      }
    }
    expect(signatures.size).toBeGreaterThan(12);
    expect(caveFields).toBeGreaterThan(480);
  }, 30000);

  it("every sampled underground start can walk its generated exit without jumping, damage or digging", () => {
    for (let seed = 1; seed <= 64; seed++) {
      const g = new Game(seed);
      for (const [id, point] of g.terrain.spawnPoints.entries()) {
        if (!point.underground) continue;
        g.activeId = id;
        const w = g.active;
        expect(g.terrain.surface(w.x)).toBeLessThan(w.y - 36);
        const direction = Math.sign(point.exitX! - w.x);
        for (
          let tick = 0;
          tick < 900 && Math.abs(w.x - point.exitX!) > 4;
          tick++
        ) {
          g.move(direction);
          g.advanceWorm(w);
          expect(g.terrain.bodyCollides(w.x, w.y)).toBe(false);
        }
        expect(
          Math.abs(w.x - point.exitX!),
          `seed ${seed}, worm ${id}`,
        ).toBeLessThanOrEqual(4);
        expect(w.hp).toBe(100);
        expect(w.y - g.terrain.surface(w.x)).toBeLessThan(8);
      }
    }
  }, 30000);

  it("repeats a field exactly and resets underground practice targets to that floor", () => {
    const g = new Game(41823, { teamSize: 2, mode: "practice" });
    const expected = g.terrain.spawnPoints.map((p) => ({ ...p }));
    expect(new Game(41823, { teamSize: 2 }).terrain.spawnPoints).toEqual(
      expected,
    );
    const target = expected.find((p) => p.underground)!;
    g.terrain.carve(target.x, target.y, 100);
    g.endTurn();
    for (let tick = 0; tick < 1500 && g.turn === 0; tick++) g.tick();
    expect(g.turn).toBe(2);
    expect(g.terrain.spawnPoints).toEqual(expected);
    expect(g.worms.map((w) => ({ x: w.x, y: w.y }))).toEqual(
      expected.map(({ x, y }) => ({ x, y })),
    );
    expect(g.terrain.bodyCollides(target.x, target.y + 2)).toBe(true);
  });

  it("lets a sheltered bot walk out when its opponent is behind the roof", () => {
    for (const seed of [7, 19, 34, 41823]) {
      const g = new Game(seed);
      const id = g.terrain.spawnPoints.findIndex((p) => p.underground);
      g.activeId = id;
      const actor = g.active;
      const enemy = g.worms.find((w) => w.team !== actor.team)!;
      for (const w of g.worms) if (w !== actor && w !== enemy) w.hp = 0;
      enemy.x = actor.x;
      enemy.y = g.terrain.footing(enemy.x, g.terrain.surface(enemy.x))!;
      const route = planMovement(g);
      expect(route.commands.length).toBeGreaterThan(0);
      for (const command of route.commands) {
        executeMove(g, command);
        g.advanceWorm(actor);
      }
      expect(actor.x).toBeCloseTo(route.x, 5);
      expect(actor.hp).toBe(100);
      expect(g.terrain.surface(actor.x)).toBeGreaterThan(actor.y - 36);
    }
  });

  it("continues older saves and validates new spawn metadata", () => {
    const original = new Game(19);
    const saved = JSON.parse(encodeSave(original, "garden"));
    delete saved.snapshot.terrain.spawnPoints;
    const restored = decodeSave(JSON.stringify(saved)).game;
    expect(restored.worms).toEqual(original.worms);
    expect(
      Buffer.from(restored.terrain.cells).equals(
        Buffer.from(original.terrain.cells),
      ),
    ).toBe(true);
    for (const bad of [
      { x: -1 },
      { y: 9000 },
      { exitX: "outside" },
      { underground: "yes" },
    ]) {
      const data = JSON.parse(encodeSave(original, "garden"));
      Object.assign(data.snapshot.terrain.spawnPoints[0], bad);
      expect(() => decodeSave(JSON.stringify(data))).toThrow();
    }
  });
});
