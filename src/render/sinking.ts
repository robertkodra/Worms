import { Terrain, SEABED_Y } from "../game/terrain";
import { clamp, Worm } from "../game/simulation";

/** Cosmetic only: an eliminated worm never blocks shots or holds up a turn. */
export interface SinkingBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  facing: number;
  settled: boolean;
  age: number;
}

export function sinkingBody(w: Worm): SinkingBody {
  return {
    x: w.x,
    y: w.y - 14,
    vx: clamp(w.vx * 0.15, -28, 28),
    vy: clamp(w.vy * 0.12, 14, 42),
    angle: 0,
    facing: w.facing,
    settled: false,
    age: 0,
  };
}

export function advanceSinkingBody(
  body: SinkingBody,
  terrain: Terrain,
  dt: number,
): void {
  dt = clamp(dt, 0, 0.05);
  if (!dt) return;
  body.age += dt;
  body.angle +=
    ((-body.facing * Math.PI) / 2 - body.angle) * (1 - Math.exp(-1.4 * dt));
  if (body.settled) {
    // Destruction can remove a submerged shelf beneath a resting body.
    if (
      body.y + 9.8 >= SEABED_Y ||
      terrain.circleCollides(body.x, body.y + 1, 9)
    )
      return;
    body.settled = false;
  }
  body.vx *= Math.exp(-1.2 * dt);
  body.vy = Math.min(42, body.vy + 18 * dt);
  const steps = Math.max(
    1,
    Math.ceil((Math.max(Math.abs(body.vx), body.vy) * dt) / 0.75),
  );
  const slice = dt / steps;
  for (let i = 0; i < steps; i++) {
    const x = body.x + body.vx * slice;
    if (!terrain.circleCollides(x, body.y, 9)) body.x = x;
    else body.vx = 0;
    const y = body.y + body.vy * slice;
    if (y + 9 >= SEABED_Y || terrain.circleCollides(body.x, y, 9)) {
      const normal = terrain.circleContact(body.x, y, 9);
      if (y + 9 >= SEABED_Y || (normal && normal.y < -0.5)) {
        body.vx = body.vy = 0;
        body.settled = true;
        break;
      }
      const slide =
        body.x + Math.sign(normal?.x ?? -body.facing) * body.vy * slice;
      if (!terrain.circleCollides(slide, y, 9)) {
        body.x = slide;
        body.y = y;
      } else if (!terrain.circleCollides(slide, body.y, 9)) body.x = slide;
      continue;
    }
    body.y = y;
  }
}
