import {
  Terrain,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INITIAL_WATER,
  seededRandom,
} from "./terrain";

export const STEP = 1 / 60;
export const GRAVITY = 390;
export const TURN_TICKS = 45 * 60;
export const RETREAT_TICKS = 5 * 60;
export const TEAM_NAMES = ["The Root Crew", "The Night Shift"];
export type Weapon = "rocket" | "grenade" | "shove" | "bridge";
export type Phase = "aim" | "retreat" | "settle" | "over";
export const WEAPONS: Record<
  Weapon,
  { name: string; short: string; hint: string }
> = {
  rocket: {
    name: "Seed Rocket",
    short: "Rocket",
    hint: "Wind catches it. Terrain regrets it.",
  },
  grenade: {
    name: "Pebble Popper",
    short: "Grenade",
    hint: "A little bounce. A 3-second fuse.",
  },
  shove: {
    name: "Spore Shove",
    short: "Shove",
    hint: "Get close. Give gravity a hand.",
  },
  bridge: {
    name: "Leaf Bridge",
    short: "Bridge",
    hint: "Aim at clear space nearby to place a bridge.",
  },
};
export interface Worm {
  id: number;
  name: string;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  facing: number;
  grounded: boolean;
  walk: number;
  hurt: number;
  fallStart: number;
}
export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "rocket" | "grenade";
  owner: number;
  age: number;
  fuse: number;
  resting: boolean;
  clearedOwner: boolean;
  trail: { x: number; y: number }[];
}
export interface GameEvent {
  type:
    | "blast"
    | "jump"
    | "damage"
    | "death"
    | "fire"
    | "bridge"
    | "turn"
    | "result"
    | "shove"
    | "bounce";
  x: number;
  y: number;
  value?: number;
  actor?: number;
  weapon?: Weapon;
}
export interface ShotResult {
  x: number;
  y: number;
  hit: boolean;
  ticks: number;
}
export interface ShotPlan {
  weapon: Weapon;
  angle: number;
  power: number;
  score: number;
  target?: { x: number; y: number };
}
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));

function distanceToWorm(x: number, y: number, w: Worm): number {
  const cy = clamp(y, w.y - 19, w.y - 9);
  return Math.hypot(x - w.x, y - cy) - 9;
}

export function shoveTargets(game: Game, actor: Worm, facing: number): Worm[] {
  return game.worms.filter((other) => {
    if (
      other.id === actor.id ||
      other.hp <= 0 ||
      (other.x - actor.x) * facing < 0 ||
      Math.hypot(other.x - actor.x, other.y - actor.y) > 72
    )
      return false;
    const length = Math.hypot(other.x - actor.x, other.y - actor.y);
    const steps = Math.ceil(length * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (
        game.terrain.solid(
          actor.x + (other.x - actor.x) * t,
          actor.y - 15 + (other.y - actor.y) * t,
        )
      )
        return false;
    }
    return true;
  });
}

export function createProjectile(
  w: Worm,
  weapon: "rocket" | "grenade",
  angle: number,
  power: number,
): Projectile {
  const speed = (weapon === "rocket" ? 700 : 535) * clamp(power, 0.14, 1);
  const cx = w.x,
    cy = w.y - 18;
  // Spawn at the body, then sweep outwards while ignoring only the owner.
  // This prevents the muzzle from appearing beyond a thin wall.
  return {
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    kind: weapon,
    owner: w.id,
    age: 0,
    fuse: 180,
    resting: false,
    clearedOwner: false,
    trail: [],
  };
}

export function advanceProjectile(
  p: Projectile,
  terrain: Terrain,
  worms: Worm[],
  wind: number,
  water: number,
): ShotResult | null {
  p.age++;
  if (p.kind === "grenade") p.fuse--;
  if (!p.resting) {
    p.vx += (p.kind === "rocket" ? wind : wind * 0.2) * STEP;
    p.vy += GRAVITY * STEP;
    const dx = p.vx * STEP,
      dy = p.vy * STEP;
    // Sub-pixel conservative sweep: radius >= 3 with samples <= 0.65 apart.
    // The identical path routine is used for both live shots and AI rollouts.
    const pieces = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.65));
    const sx = dx / pieces,
      sy = dy / pieces;
    for (let i = 0; i < pieces; i++) {
      const nx = p.x + sx,
        ny = p.y + sy;
      const owner = worms.find((w) => w.id === p.owner);
      if (owner && distanceToWorm(nx, ny, owner) > 5) p.clearedOwner = true;
      const hitWorm = worms.some(
        (w) =>
          w.hp > 0 &&
          (w.id !== p.owner || p.clearedOwner) &&
          distanceToWorm(nx, ny, w) < 3.5,
      );
      const hitTerrain = terrain.circleCollides(nx, ny, 3.2);
      if (hitWorm || hitTerrain) {
        if (p.kind === "rocket")
          return { x: nx, y: ny, hit: true, ticks: p.age };
        const hitX = terrain.circleCollides(nx, p.y, 3.2);
        const hitY = terrain.circleCollides(p.x, ny, 3.2);
        if (hitX && !hitY) {
          p.vx *= -0.52;
          p.vy *= 0.78;
        } else {
          p.vy *= -0.48;
          p.vx *= 0.7;
        }
        if (
          Math.abs(p.vy) < 24 &&
          terrain.circleCollides(p.x, p.y + 1.5, 3.2)
        ) {
          p.vy = 0;
          p.vx = 0;
          p.resting = true;
        }
        break;
      }
      p.x = nx;
      p.y = ny;
    }
  }
  if (p.fuse <= 0 && p.kind === "grenade")
    return { x: p.x, y: p.y, hit: true, ticks: p.age };
  if (
    p.y > water + 15 ||
    p.x < -100 ||
    p.x > WORLD_WIDTH + 100 ||
    p.y < -1800 ||
    p.age > 720
  )
    return { x: p.x, y: p.y, hit: false, ticks: p.age };
  return null;
}

export class Game {
  terrain = new Terrain();
  worms: Worm[] = [];
  events: GameEvent[] = [];
  projectile: Projectile | null = null;
  phase: Phase = "aim";
  ticks = 0;
  turnTicks = TURN_TICKS;
  retreatTicks = 0;
  settleTicks = 0;
  turn = 0;
  activeId = 0;
  rotations = [0, 0];
  winner: number | null = null;
  wind = 0;
  water = INITIAL_WATER;
  stats = { shots: 0, damage: 0, craters: 0 };
  inventory: Record<Weapon, number>[] = [
    { rocket: -1, grenade: -1, shove: 3, bridge: 2 },
    { rocket: -1, grenade: -1, shove: 3, bridge: 2 },
  ];
  readonly random: () => number;

  constructor(readonly seed = 41823) {
    this.random = seededRandom(seed + 7919);
    this.terrain.generate(seed);
    const names = ["Pip", "Miso", "Moss", "Grub"];
    [265, 535, 1080, 1360].forEach((x, id) => {
      let feet = this.terrain.surface(x) - 1;
      while (this.terrain.bodyCollides(x, feet)) feet--;
      this.worms.push({
        id,
        name: names[id],
        team: id < 2 ? 0 : 1,
        x,
        y: feet,
        vx: 0,
        vy: 0,
        hp: 100,
        facing: id < 2 ? 1 : -1,
        grounded: true,
        walk: 0,
        hurt: 0,
        fallStart: feet,
      });
    });
    this.wind = Math.round((this.random() - 0.5) * 64);
  }

  get active(): Worm {
    return this.worms.find((w) => w.id === this.activeId)!;
  }
  get round(): number {
    return Math.floor(this.turn / 2) + 1;
  }
  get acting(): boolean {
    return this.phase === "aim" || this.phase === "retreat";
  }

  move(direction: number): void {
    const w = this.active;
    if (!this.acting || w.hp <= 0 || !w.grounded) return;
    w.vx = clamp(direction, -1, 1) * 52;
    if (direction) w.facing = Math.sign(direction);
  }

  jump(backflip = false): boolean {
    const w = this.active;
    if (!this.acting || w.hp <= 0 || !w.grounded) return false;
    w.grounded = false;
    w.vy = backflip ? -217 : -171;
    w.vx = w.facing * (backflip ? -61 : 103);
    w.fallStart = w.y;
    this.events.push({ type: "jump", x: w.x, y: w.y, actor: w.id });
    return true;
  }

  canBridge(x: number, y: number): { valid: boolean; reason: string } {
    const w = this.active;
    if (this.inventory[w.team].bridge === 0)
      return { valid: false, reason: "No bridges left." };
    if (Math.hypot(x - w.x, y - (w.y - 10)) > 115)
      return { valid: false, reason: "Place it closer to your worm." };
    if (x - 43 < 0 || x + 43 >= WORLD_WIDTH || y < 25 || y + 8 >= this.water)
      return { valid: false, reason: "Keep the bridge above water." };
    for (let ix = Math.floor(x - 43); ix < x + 43; ix++)
      for (let iy = Math.floor(y); iy < y + 7; iy++) {
        if (this.terrain.solid(ix, iy))
          return { valid: false, reason: "The bridge needs clear space." };
      }
    if (
      this.worms.some(
        (other) =>
          other.hp > 0 &&
          other.x + 11 > x - 43 &&
          other.x - 11 < x + 43 &&
          other.y > y &&
          other.y - 28 < y + 7,
      )
    )
      return { valid: false, reason: "A worm is in the way." };
    return { valid: true, reason: "Release to place your bridge." };
  }

  attack(
    weapon: Weapon,
    angle: number,
    power = 0.7,
    target?: { x: number; y: number },
  ): boolean {
    const w = this.active;
    if (
      this.phase !== "aim" ||
      w.hp <= 0 ||
      this.inventory[w.team][weapon] === 0
    )
      return false;
    if (![angle, power].every(Number.isFinite)) return false;
    if (weapon === "bridge") {
      if (
        !target ||
        !Number.isFinite(target.x) ||
        !Number.isFinite(target.y) ||
        !this.canBridge(target.x, target.y).valid
      )
        return false;
      this.terrain.rectangle(target.x - 43, target.y, 86, 7);
      this.events.push({
        type: "bridge",
        x: target.x,
        y: target.y,
        actor: w.id,
      });
    } else if (weapon === "shove") {
      const facing = Math.cos(angle) < 0 ? -1 : 1;
      w.facing = facing;
      for (const other of shoveTargets(this, w, facing)) {
        this.damage(other, 15);
        other.vx = facing * 230;
        other.vy = -135;
        other.grounded = false;
      }
      this.events.push({
        type: "shove",
        x: w.x + facing * 30,
        y: w.y - 15,
        actor: w.id,
      });
    } else {
      w.facing = Math.cos(angle) < 0 ? -1 : 1;
      this.projectile = createProjectile(w, weapon, angle, power);
      this.events.push({
        type: "fire",
        x: w.x,
        y: w.y - 18,
        actor: w.id,
        weapon,
      });
      this.stats.shots++;
    }
    if (this.inventory[w.team][weapon] > 0) this.inventory[w.team][weapon]--;
    this.phase = "retreat";
    this.retreatTicks = RETREAT_TICKS;
    this.settleTicks = 0;
    return true;
  }

  damage(w: Worm, amount: number): void {
    if (w.hp <= 0) return;
    const n = Math.min(w.hp, Math.max(0, Math.round(amount)));
    if (!n) return;
    w.hp -= n;
    w.hurt = 0.7;
    this.stats.damage += n;
    this.events.push({
      type: "damage",
      x: w.x,
      y: w.y - 25,
      value: n,
      actor: w.id,
    });
    if (!w.hp) this.events.push({ type: "death", x: w.x, y: w.y, actor: w.id });
  }

  explode(x: number, y: number, kind: "rocket" | "grenade"): void {
    const radius = kind === "rocket" ? 61 : 69;
    // Prototype uses explicit radial damage, without soil occlusion. The same
    // policy is used in the planner; a later occlusion model needs new tuning.
    for (const w of this.worms) {
      if (w.hp <= 0) continue;
      const d = Math.hypot(w.x - x, w.y - 14 - y);
      if (d < radius + 34) {
        const strength = 1 - d / (radius + 34);
        this.damage(w, (kind === "rocket" ? 56 : 62) * strength);
        w.vx += (w.x < x ? -1 : 1) * 245 * strength;
        w.vy = -Math.max(85, 215 * strength);
        w.grounded = false;
        w.fallStart = w.y;
      }
    }
    this.terrain.carve(x, y, radius);
    this.stats.craters++;
    this.events.push({ type: "blast", x, y, value: radius });
  }

  endTurn(): void {
    if (this.phase !== "aim") return;
    this.turnTicks = 0;
    this.phase = "settle";
    this.settleTicks = 0;
  }

  private advanceWorm(w: Worm): void {
    if (w.hp <= 0) return;
    w.hurt = Math.max(0, w.hurt - STEP);
    if (w.grounded && !this.terrain.bodyCollides(w.x, w.y + 1.2)) {
      w.grounded = false;
      w.fallStart = w.y;
    }
    if (!w.grounded) w.vy += GRAVITY * STEP;
    const dx = w.vx * STEP,
      dy = w.vy * STEP;
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.8),
    );
    for (let i = 0; i < steps; i++) {
      const nx = w.x + dx / steps;
      if (!this.terrain.bodyCollides(nx, w.y)) w.x = nx;
      else if (w.grounded) {
        let stepped = false;
        for (let up = 1; up <= 5; up++)
          if (!this.terrain.bodyCollides(nx, w.y - up)) {
            w.x = nx;
            w.y -= up;
            stepped = true;
            break;
          }
        if (!stepped) w.vx = 0;
      } else w.vx = 0;
      const ny = w.y + dy / steps;
      if (!this.terrain.bodyCollides(w.x, ny)) w.y = ny;
      else if (w.vy > 0) {
        const fall = w.y - w.fallStart;
        if (!w.grounded && fall > 115) this.damage(w, (fall - 115) * 0.16);
        w.grounded = true;
        w.vy = 0;
        w.vx *= 0.45;
        w.fallStart = w.y;
        break;
      } else {
        w.vy = 0;
        break;
      }
    }
    if (w.grounded) {
      // Small downhill snap keeps inching attached to gentle slopes.
      for (
        let down = 0;
        down < 4 && !this.terrain.bodyCollides(w.x, w.y + 1);
        down++
      )
        w.y += 1;
      w.walk += Math.abs(w.vx) * STEP;
      w.vx *= 0.65;
    }
    if (w.y - 6 > this.water || w.x < -30 || w.x > WORLD_WIDTH + 30)
      this.damage(w, w.hp);
  }

  tick(): void {
    if (this.phase === "over") return;
    this.ticks++;
    for (const w of this.worms) this.advanceWorm(w);
    if (this.projectile) {
      const p = this.projectile;
      if (this.ticks % 3 === 0) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 35) p.trail.shift();
      }
      const hit = advanceProjectile(
        p,
        this.terrain,
        this.worms,
        this.wind,
        this.water,
      );
      if (hit) {
        if (hit.hit) this.explode(hit.x, hit.y, p.kind);
        this.projectile = null;
      }
    }
    if (this.phase === "aim") {
      this.turnTicks--;
      if (this.turnTicks <= 0 || this.active.hp <= 0) this.endTurn();
    } else if (this.phase === "retreat") {
      this.retreatTicks--;
      if (this.retreatTicks <= 0 || this.active.hp <= 0) this.phase = "settle";
    }
    if (this.phase === "settle") {
      this.settleTicks++;
      const moving = this.worms.some(
        (w) => w.hp > 0 && (!w.grounded || Math.abs(w.vx) > 3),
      );
      if (
        !this.projectile &&
        ((!moving && this.settleTicks > 30) || this.settleTicks > 240)
      )
        this.nextTurn();
    }
  }

  private nextTurn(): void {
    const living = [0, 1].map((team) =>
      this.worms.filter((w) => w.team === team && w.hp > 0),
    );
    if (!living[0].length || !living[1].length) {
      this.winner = living[0].length ? 0 : living[1].length ? 1 : -1;
      this.phase = "over";
      this.events.push({ type: "result", x: 800, y: 400, value: this.winner });
      return;
    }
    this.turn++;
    const team = this.turn % 2;
    if (team === 0) {
      this.rotations[0]++;
      this.rotations[1]++;
      this.wind = Math.round((this.random() - 0.5) * 64);
      if (this.round > 10) this.water -= 24;
    }
    const members = this.worms.filter((w) => w.team === team);
    let index = this.rotations[team] % members.length;
    while (members[index].hp <= 0) index = (index + 1) % members.length;
    this.activeId = members[index].id;
    this.phase = "aim";
    this.turnTicks = TURN_TICKS;
    this.settleTicks = 0;
    this.events.push({
      type: "turn",
      x: this.active.x,
      y: this.active.y,
      actor: this.activeId,
    });
  }
}

export function simulateShot(
  game: Game,
  angle: number,
  power: number,
  weapon: "rocket" | "grenade",
): ShotResult {
  const p = createProjectile(game.active, weapon, angle, power);
  for (let i = 0; i < 721; i++) {
    const result = advanceProjectile(
      p,
      game.terrain,
      game.worms,
      game.wind,
      game.water,
    );
    if (result) return result;
  }
  return { x: p.x, y: p.y, hit: false, ticks: p.age };
}

export function* planShots(game: Game): Generator<ShotPlan, ShotPlan> {
  const actor = game.active;
  let best: ShotPlan = {
    weapon: "rocket",
    angle: actor.facing > 0 ? -Math.PI / 4 : (-Math.PI * 3) / 4,
    power: 0.8,
    score: -Infinity,
  };
  const enemies = game.worms.filter((w) => w.team !== actor.team && w.hp > 0);
  for (const enemy of enemies) {
    if (Math.hypot(enemy.x - actor.x, enemy.y - actor.y) < 67) {
      const angle = enemy.x < actor.x ? Math.PI : 0;
      const targets = shoveTargets(game, actor, Math.cos(angle) < 0 ? -1 : 1);
      if (!targets.some((w) => w.id === enemy.id)) continue;
      const score = targets.reduce(
        (sum, w) =>
          sum + (w.hp <= 15 ? 100 : 35) * (w.team === actor.team ? -1.8 : 1),
        0,
      );
      const candidate: ShotPlan = { weapon: "shove", angle, power: 1, score };
      if (
        game.inventory[actor.team].shove !== 0 &&
        candidate.score > best.score
      )
        best = candidate;
    }
  }
  // Search both directions, including banked grenades, under a fixed budget.
  for (const weapon of ["rocket", "grenade"] as const) {
    for (let degrees = -172; degrees <= -8; degrees += 8) {
      for (let power = 0.34; power <= 1.001; power += 0.11) {
        const angle = (degrees * Math.PI) / 180;
        const result = simulateShot(game, angle, power, weapon);
        let score = -4;
        if (result.hit) {
          const radius = weapon === "rocket" ? 95 : 103;
          for (const w of game.worms) {
            if (w.hp <= 0) continue;
            const distance = Math.hypot(w.x - result.x, w.y - 14 - result.y);
            const damage =
              Math.max(0, 1 - distance / radius) *
              (weapon === "rocket" ? 56 : 62);
            const value =
              damage +
              (damage >= w.hp ? 45 : 0) +
              (distance < radius && w.y > game.water - 70 ? 15 : 0);
            score += value * (w.team === actor.team ? -1.8 : 1);
          }
          // Excavation towards a sheltered enemy is preferable to a random miss.
          const nearest = Math.min(
            ...enemies.map((w) => Math.hypot(w.x - result.x, w.y - result.y)),
          );
          score += Math.max(0, 8 - nearest / 35);
        }
        const candidate = { weapon, angle, power, score };
        if (score > best.score) best = candidate;
        yield best;
      }
    }
  }
  return best;
}
