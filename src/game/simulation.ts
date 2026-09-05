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
export { WEAPONS, WEAPON_IDS } from "./weapons";
export type { Weapon } from "./weapons";
import {
  Weapon,
  ProjectileKind,
  WEAPONS,
  BALLISTICS,
  createInventory,
} from "./weapons";
export type Phase = "aim" | "retreat" | "settle" | "over";
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
  kind: ProjectileKind;
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
    | "bounce"
    | "land"
    | "step"
    | "tracer"
    | "teleport"
    | "heal"
    | "outcome";
  x: number;
  y: number;
  value?: number;
  actor?: number;
  weapon?: Weapon;
  endX?: number;
  endY?: number;
  outcome?: "hit" | "miss" | "friendly" | "skip" | "utility" | "heal";
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
  weapon: ProjectileKind,
  angle: number,
  power: number,
): Projectile {
  const speed = BALLISTICS[weapon].speed * clamp(power, 0.14, 1);
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
    fuse: BALLISTICS[weapon].fuse,
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
  const profile = BALLISTICS[p.kind];
  if (profile.fuse) p.fuse--;
  if (p.resting && !terrain.circleCollides(p.x, p.y + 1.5, 3.2))
    p.resting = false;
  if (!p.resting) {
    p.vx += wind * profile.wind * STEP;
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
        if (!profile.bounce) return { x: nx, y: ny, hit: true, ticks: p.age };
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
  if (p.fuse <= 0 && profile.fuse)
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
  projectiles: Projectile[] = [];
  get projectile(): Projectile | null {
    return this.projectiles[0] ?? null;
  }
  set projectile(p: Projectile | null) {
    this.projectiles = p ? [p] : [];
  }
  private action: { actor: number; weapon?: Weapon; health: number[] } | null =
    null;
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
  inventory: Record<Weapon, number>[] = [createInventory(), createInventory()];
  readonly random: () => number;

  constructor(readonly seed = 41823) {
    this.random = seededRandom(seed + 7919);
    this.terrain.generate(seed);
    const names = ["Pip", "Miso", "Moss", "Grub"];
    this.terrain.spawnXs.forEach((x, id) => {
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

  teleportLanding(x: number, y: number): { x: number; y: number } | null {
    if (
      ![x, y].every(Number.isFinite) ||
      x < 24 ||
      x > WORLD_WIDTH - 24 ||
      y < 25 ||
      y >= this.water - 15
    )
      return null;
    const feet = this.terrain.surface(x, Math.max(0, y - 24));
    if (
      Math.abs(feet - y) > 65 ||
      feet > this.water - 25 ||
      Math.hypot(x - this.active.x, feet - this.active.y) > 550
    )
      return null;
    let landing = feet;
    for (let up = 0; up < 7 && this.terrain.bodyCollides(x, landing); up++)
      landing--;
    if (
      this.terrain.bodyCollides(x, landing) ||
      !this.terrain.bodyCollides(x, landing + 1.2)
    )
      return null;
    if (
      this.worms.some(
        (w) =>
          w.hp > 0 &&
          w.id !== this.activeId &&
          Math.abs(w.x - x) < 23 &&
          Math.abs(w.y - landing) < 32,
      )
    )
      return null;
    return { x, y: landing };
  }

  canPlace(
    weapon: Weapon,
    x: number,
    y: number,
  ): { valid: boolean; reason: string } {
    if (![x, y].every(Number.isFinite))
      return { valid: false, reason: "Choose a point on the battlefield." };
    if (this.inventory[this.active.team][weapon] === 0)
      return { valid: false, reason: "None left in the kit." };
    if (weapon === "bridge") return this.canBridge(x, y);
    if (weapon === "teleport")
      return this.teleportLanding(x, y)
        ? { valid: true, reason: "Release to blink to this ledge." }
        : {
            valid: false,
            reason: "Pick clear, solid footing within 550 pixels.",
          };
    if (weapon === "airstrike")
      return x > 20 && x < WORLD_WIDTH - 20 && y >= 0 && y < this.water
        ? { valid: true, reason: "Release to rain five shells on this column." }
        : { valid: false, reason: "Choose a column inside the battlefield." };
    return { valid: false, reason: "This item does not use a landing point." };
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
      !Object.hasOwn(WEAPONS, weapon) ||
      this.inventory[w.team][weapon] === 0
    )
      return false;
    if (![angle, power].every(Number.isFinite)) return false;
    if (WEAPONS[weapon].mode === "place") {
      if (!target || !this.canPlace(weapon, target.x, target.y).valid)
        return false;
    }
    if (weapon === "medkit" && w.hp >= 100) return false;
    this.action = {
      actor: w.id,
      weapon,
      health: this.worms.map((worm) => worm.hp),
    };
    if (weapon === "teleport") {
      const landing = this.teleportLanding(target!.x, target!.y)!;
      this.events.push({ type: "teleport", x: w.x, y: w.y - 14, actor: w.id });
      w.x = landing.x;
      w.y = landing.y;
      w.vx = 0;
      w.vy = 0;
      w.grounded = true;
      w.fallStart = w.y;
      this.events.push({ type: "teleport", x: w.x, y: w.y - 14, actor: w.id });
    } else if (weapon === "medkit") {
      const healed = Math.min(35, 100 - w.hp);
      w.hp += healed;
      this.events.push({
        type: "heal",
        x: w.x,
        y: w.y - 25,
        value: healed,
        actor: w.id,
      });
    } else if (weapon === "airstrike") {
      for (let i = -2; i <= 2; i++) {
        const p = createProjectile(w, "airstrike", Math.PI / 2, 1);
        p.x = clamp(target!.x + i * 43, 8, WORLD_WIDTH - 8);
        p.y = -80 - Math.abs(i) * 38;
        p.vy = 145;
        p.clearedOwner = true;
        this.projectiles.push(p);
      }
      this.events.push({
        type: "fire",
        x: target!.x,
        y: 40,
        actor: w.id,
        weapon,
      });
      this.stats.shots++;
    } else if (weapon === "shotgun" || weapon === "sniper") {
      w.facing = Math.cos(angle) < 0 ? -1 : 1;
      const rays = traceWeapon(this, w, weapon, angle);
      // Resolve all pellet hits against the same scene, so a lethal first pellet
      // cannot let later pellets pass through a worm in the same shot.
      const amounts = new Map<number, number>();
      for (const ray of rays) {
        if (ray.actor !== undefined)
          amounts.set(ray.actor, (amounts.get(ray.actor) ?? 0) + ray.damage);
        this.events.push({
          type: "tracer",
          x: w.x,
          y: w.y - 18,
          endX: ray.x,
          endY: ray.y,
          weapon,
        });
        if (ray.soil)
          this.terrain.carve(ray.x, ray.y, weapon === "sniper" ? 5 : 3);
      }
      for (const [id, amount] of amounts)
        this.damage(
          this.worms.find((other) => other.id === id)!,
          amount,
        );
      this.events.push({
        type: "fire",
        x: w.x,
        y: w.y - 18,
        actor: w.id,
        weapon,
      });
      this.stats.shots++;
    } else if (weapon === "bridge") {
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
      this.projectile = createProjectile(
        w,
        weapon as ProjectileKind,
        angle,
        power,
      );
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

  explode(x: number, y: number, kind: ProjectileKind): void {
    const { radius, damage } = BALLISTICS[kind];
    // Prototype uses explicit radial damage, without soil occlusion. The same
    // policy is used in the planner; a later occlusion model needs new tuning.
    for (const w of this.worms) {
      if (w.hp <= 0) continue;
      const d = Math.hypot(w.x - x, w.y - 14 - y);
      if (d < radius + 34) {
        const strength = 1 - d / (radius + 34);
        this.damage(w, damage * strength);
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
    this.action ??= {
      actor: this.activeId,
      health: this.worms.map((w) => w.hp),
    };
    this.turnTicks = 0;
    this.phase = "settle";
    this.settleTicks = 0;
  }

  advanceWorm(w: Worm): void {
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
        if (!w.grounded && w.vy > 55)
          this.events.push({ type: "land", x: w.x, y: w.y, actor: w.id });
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
      const beforeStep = Math.floor(w.walk / 17);
      w.walk += Math.abs(w.vx) * STEP;
      if (Math.floor(w.walk / 17) !== beforeStep)
        this.events.push({ type: "step", x: w.x, y: w.y, actor: w.id });
      w.vx *= 0.65;
    }
    if (w.y - 6 > this.water || w.x < -30 || w.x > WORLD_WIDTH + 30)
      this.damage(w, w.hp);
  }

  tick(): void {
    if (this.phase === "over") return;
    this.ticks++;
    for (const w of this.worms) this.advanceWorm(w);
    const flying = this.projectiles;
    this.projectiles = [];
    for (const p of flying) {
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
      if (!hit) this.projectiles.push(p);
      else if (hit.hit) {
        this.explode(hit.x, hit.y, p.kind);
        if (p.kind === "cluster") {
          const owner = this.worms.find((w) => w.id === p.owner)!;
          for (let i = 0; i < 5; i++) {
            const fragment = createProjectile(
              owner,
              "fragment",
              -Math.PI + 0.28 + i * 0.64,
              1,
            );
            fragment.x = hit.x;
            fragment.y = hit.y - 5;
            fragment.clearedOwner = true;
            fragment.fuse = 48 + i * 7;
            this.projectiles.push(fragment);
          }
        }
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
        !this.projectiles.length &&
        ((!moving && this.settleTicks > 30) || this.settleTicks > 240)
      )
        this.nextTurn();
    }
  }

  private nextTurn(): void {
    if (this.action) {
      const action = this.action;
      const actor = this.worms.find((w) => w.id === action.actor)!;
      const enemyDamage = this.worms.reduce(
        (sum, w, i) =>
          sum +
          (w.team !== actor.team ? Math.max(0, action.health[i] - w.hp) : 0),
        0,
      );
      const friendlyDamage = this.worms.reduce(
        (sum, w, i) =>
          sum +
          (w.team === actor.team ? Math.max(0, action.health[i] - w.hp) : 0),
        0,
      );
      const outcome = !action.weapon
        ? "skip"
        : action.weapon === "medkit"
          ? "heal"
          : ["bridge", "teleport"].includes(action.weapon)
            ? "utility"
            : friendlyDamage > enemyDamage
              ? "friendly"
              : enemyDamage > 0
                ? "hit"
                : "miss";
      this.events.push({
        type: "outcome",
        x: actor.x,
        y: actor.y,
        actor: actor.id,
        weapon: action.weapon,
        outcome,
        value: enemyDamage,
      });
      this.action = null;
    }
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

export interface TraceHit {
  x: number;
  y: number;
  actor?: number;
  soil: boolean;
  damage: number;
}
export function traceWeapon(
  game: Game,
  actor: Worm,
  weapon: "shotgun" | "sniper",
  angle: number,
): TraceHit[] {
  const spread =
    weapon === "shotgun" ? [-0.095, -0.0475, 0, 0.0475, 0.095] : [0];
  const range = weapon === "shotgun" ? 310 : 1800;
  return spread.map((offset) => {
    const dx = Math.cos(angle + offset),
      dy = Math.sin(angle + offset);
    let x = actor.x,
      y = actor.y - 18;
    for (let d = 0.5; d <= range; d += 0.5) {
      x = actor.x + dx * d;
      y = actor.y - 18 + dy * d;
      if (game.terrain.solid(x, y)) return { x, y, soil: true, damage: 0 };
      const victim = game.worms.find(
        (w) => w.id !== actor.id && w.hp > 0 && distanceToWorm(x, y, w) < 0,
      );
      if (victim)
        return {
          x,
          y,
          actor: victim.id,
          soil: false,
          damage: weapon === "sniper" ? 42 : 12 * (1 - (0.5 * d) / range),
        };
      if (x < 0 || x >= WORLD_WIDTH || y > game.water || y < -800) break;
    }
    return { x, y, soil: false, damage: 0 };
  });
}

export function simulateShot(
  game: Game,
  angle: number,
  power: number,
  weapon: ProjectileKind,
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
  if (actor.hp <= 55 && game.inventory[actor.team].medkit > 0) {
    const healScore = actor.hp < 30 ? 70 : 30;
    if (healScore > best.score)
      best = { weapon: "medkit", angle: 0, power: 1, score: healScore };
  }
  for (const enemy of enemies) {
    const angle = Math.atan2(enemy.y - actor.y, enemy.x - actor.x);
    for (const weapon of ["sniper", "shotgun"] as const) {
      if (!game.inventory[actor.team][weapon]) continue;
      const score = traceWeapon(game, actor, weapon, angle).reduce(
        (sum, ray) => {
          const victim = game.worms.find((w) => w.id === ray.actor);
          return (
            sum +
            (victim ? ray.damage * (victim.team === actor.team ? -1.8 : 1) : 0)
          );
        },
        0,
      );
      if (score > best.score) best = { weapon, angle, power: 1, score };
    }
    if (
      game.inventory[actor.team].airstrike > 0 &&
      game.terrain.surface(enemy.x) >= enemy.y - 6
    ) {
      let score = 0;
      for (const w of game.worms)
        if (w.hp > 0 && Math.abs(w.x - enemy.x) < 115)
          score +=
            Math.max(0, 45 - Math.abs(w.x - enemy.x) * 0.25) *
            (w.team === actor.team ? -2 : 1);
      if (score > best.score)
        best = {
          weapon: "airstrike",
          angle: 0,
          power: 1,
          score,
          target: { x: enemy.x, y: enemy.y - 12 },
        };
    }
  }
  // Search both directions, including banked grenades, under a fixed budget.
  for (const weapon of ["rocket", "grenade", "mortar", "cluster"] as const) {
    if (game.inventory[actor.team][weapon] === 0) continue;
    for (let degrees = -172; degrees <= -8; degrees += 8) {
      for (let power = 0.34; power <= 1.001; power += 0.11) {
        const angle = (degrees * Math.PI) / 180;
        const result = simulateShot(game, angle, power, weapon);
        let score = -4;
        if (result.hit) {
          const radius = BALLISTICS[weapon].radius + 34;
          for (const w of game.worms) {
            if (w.hp <= 0) continue;
            const distance = Math.hypot(w.x - result.x, w.y - 14 - result.y);
            const damage =
              Math.max(0, 1 - distance / radius) * BALLISTICS[weapon].damage;
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
