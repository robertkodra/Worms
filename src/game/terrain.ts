export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;
export const INITIAL_WATER = 802;
export const SEABED_Y = WORLD_HEIGHT - 18;
export const WORM_RADIUS = 9;
export const WORM_HEIGHT = 28;

export interface SpawnPoint {
  x: number;
  y: number;
  underground: boolean;
  /** The walking entrance of an intact generated cave; null on the surface. */
  exitX: number | null;
}

export interface RandomSource {
  (): number;
  getState(): number;
  setState(state: number): void;
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  random.getState = () => state;
  random.setState = (value: number) => {
    state = value >>> 0;
  };
  return random;
}

export class Terrain {
  readonly cells: Uint8Array;
  readonly tops: Int32Array;
  revision = 0;
  layout = "Twin gardens";
  spawnPoints: SpawnPoint[] = [];
  // Retained in version-1 saves for compatibility with the earlier release.
  get spawnXs(): number[] {
    return this.spawnPoints.map((p) => p.x);
  }

  constructor(
    readonly width = WORLD_WIDTH,
    readonly height = WORLD_HEIGHT,
  ) {
    this.cells = new Uint8Array(width * height);
    this.tops = new Int32Array(width).fill(height);
  }

  solid(x: number, y: number): boolean {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    return (
      ix >= 0 &&
      iy >= 0 &&
      ix < this.width &&
      iy < this.height &&
      this.cells[iy * this.width + ix] !== 0
    );
  }

  material(x: number, y: number): number {
    return this.cells[Math.floor(y) * this.width + Math.floor(x)] ?? 0;
  }

  generate(seed: number, teamSize: 2 | 3 | 4 = 3): void {
    this.cells.fill(0);
    this.tops.fill(this.height);
    const random = seededRandom(seed);
    const variant = Math.abs(Math.floor(seed)) % 4;
    this.layout = [
      "Broken archipelago",
      "Rolling ridgeline",
      "Sunken valley",
      "Garden mesas",
    ][variant];
    const phase = random() * Math.PI * 2;
    const channel = 745 + Math.floor(random() * 110);
    const gaps: [number, number][] =
      variant === 0
        ? [
            [385 + random() * 50, 50 + random() * 35],
            [790 + random() * 35, 55 + random() * 35],
            [1180 + random() * 45, 45 + random() * 35],
          ]
        : variant === 3
          ? [[channel, 65 + random() * 55]]
          : [];
    const base = 455 + random() * 65;
    for (let x = 45; x < this.width - 45; x++) {
      if (gaps.some(([center, width]) => Math.abs(x - center) < width / 2))
        continue;
      const edge = Math.max(0, 100 - Math.min(x, this.width - x)) * 0.8;
      let top =
        base +
        36 * Math.sin(x * 0.006 + phase) +
        18 * Math.sin(x * 0.016 + phase) +
        edge;
      if (variant === 1)
        top +=
          -125 *
          Math.exp(-(((x - (650 + ((seed % 97) / 97) * 250)) / 330) ** 2));
      if (variant === 2) top += 150 * Math.exp(-(((x - 800) / 320) ** 2));
      if (variant === 3)
        top += 42 * Math.sin(x * 0.009 + phase) + (x > channel ? -65 : 25);
      top = Math.round(top);
      this.tops[x] = top;
      for (let y = top; y < 862; y++) this.cells[y * this.width + x] = 1;
    }
    const caves = this.carveGalleries(random);
    this.spawnPoints = this.scatterSpawns(random, teamSize, caves);
    this.revision++;
  }

  /** Carve roomy galleries into land, with a gentle ramp back to daylight.
   * Wavy roofs give each burrow a different silhouette; floors stay walkable. */
  private carveGalleries(random: RandomSource) {
    const spans: [number, number][] = [];
    for (let x = 55; x < this.width - 55; x++) {
      if (this.tops[x] >= INITIAL_WATER) continue;
      const lo = x;
      while (x < this.width - 55 && this.tops[x] < INITIAL_WATER) x++;
      const count = Math.max(1, Math.round((x - lo) / 440));
      for (let i = 0; i < count; i++)
        spans.push([
          Math.round(lo + ((x - lo) * i) / count) + 24,
          Math.round(lo + ((x - lo) * (i + 1)) / count) - 24,
        ]);
    }
    const caves: {
      lo: number;
      hi: number;
      exitX: number;
      floor: (x: number) => number;
    }[] = [];
    for (const [lo, hi] of spans) {
      if (hi - lo < 205) continue;
      const exitX = random() < 0.5 ? lo : hi;
      const entrance = this.tops[exitX] - 2;
      const depth = Math.min(
        118 + random() * 18,
        680 - entrance,
        (hi - lo - 54) * 0.57,
      );
      if (depth < 78) continue;
      const ramp = depth / 0.57;
      const floor = (x: number) =>
        Math.round(
          entrance +
            depth * Math.min(1, Math.abs(x - exitX) / ramp) +
            2 * Math.sin((x - exitX) * 0.032),
        );
      const phase = random() * Math.PI * 2;
      for (let x = lo; x <= hi; x++) {
        const endDistance = exitX === lo ? hi - x : x - lo;
        const height =
          (74 + 13 * Math.sin(x * 0.027 + phase) + 7 * Math.sin(x * 0.064)) *
          Math.sqrt(Math.min(1, endDistance / 38));
        const bottom = floor(x);
        const ceiling = Math.floor(bottom - height);
        // Open thin roof slivers into daylight instead of leaving floating
        // pixels at an entrance. Intact underground starts retain solid cover.
        const top = ceiling - this.tops[x] < 24 ? this.tops[x] : ceiling;
        for (let y = top; y < bottom; y++) this.cells[y * this.width + x] = 0;
      }
      caves.push({ lo, hi, exitX, floor });
    }
    return caves;
  }

  /** Find an actual capsule footing close to a proposed floor, including slopes. */
  footing(x: number, floor: number): number | null {
    for (let y = Math.floor(floor); y >= floor - 12; y--) {
      if (this.bodyCollides(x, y)) continue;
      const contact = this.bodyContact(x, y);
      if (contact && contact.y < -0.75) return y;
    }
    return null;
  }

  private scatterSpawns(
    random: RandomSource,
    teamSize: 2 | 3 | 4,
    caves: {
      lo: number;
      hi: number;
      exitX: number;
      floor: (x: number) => number;
    }[],
  ): SpawnPoint[] {
    const candidates: SpawnPoint[] = [];
    for (let x = 120; x <= this.width - 120; x += 8) {
      for (let floor = this.tops[x]; floor <= INITIAL_WATER - 120; floor++) {
        if (!this.solid(x, floor) || this.solid(x, floor - 1)) continue;
        const y = this.footing(x, floor);
        if (y === null || this.bodyCollides(x, y - 12)) continue;
        // Room on both sides, away from a cliff edge or a narrow stalagmite.
        if (
          [-18, 18].some((dx) => {
            const neighbor = this.surface(x + dx, y - 18);
            return (
              Math.abs(neighbor - y) > 18 ||
              this.footing(x + dx, neighbor) === null
            );
          })
        )
          continue;
        const underground = this.surface(x) < y - WORM_HEIGHT - 8;
        const cave = caves.find(
          (c) =>
            x >= c.lo + 24 && x <= c.hi - 24 && Math.abs(y - c.floor(x)) < 12,
        );
        if (underground && !cave) continue;
        candidates.push({
          x,
          y,
          underground,
          exitX: underground ? cave!.exitX : null,
        });
      }
    }
    const shuffle = <T>(items: T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    // Pick separated positions first. Team membership is assigned afterwards,
    // never inferred from x; both teams receive the same number of cave starts.
    for (let attempt = 0; attempt < 100; attempt++) {
      const selected: SpawnPoint[] = [];
      // A field with too little intact cave cover gets surface starts for both
      // teams. Never force one crew into an unsafe hole to satisfy a quota.
      const caveCount =
        attempt >= 80 ? 0 : teamSize === 4 && attempt < 20 ? 4 : 2;
      for (const underground of [true, false]) {
        const wanted = underground ? caveCount : teamSize * 2 - caveCount;
        for (const p of shuffle(
          candidates.filter((p) => p.underground === underground),
        )) {
          if (
            selected.filter((s) => s.underground === underground).length ===
            wanted
          )
            break;
          if (selected.every((s) => Math.hypot(s.x - p.x, s.y - p.y) >= 120))
            selected.push(p);
        }
      }
      if (
        selected.length !== teamSize * 2 ||
        selected.filter((p) => p.underground).length !== caveCount
      )
        continue;
      const xs = selected.map((p) => p.x);
      if (Math.max(...xs) - Math.min(...xs) < this.width * 0.65) continue;
      for (let deal = 0; deal < 80; deal++) {
        const points = shuffle(selected);
        if (
          points.slice(0, teamSize).filter((p) => p.underground).length !==
          caveCount / 2
        )
          continue;
        // Keep both crews spread across the field, even in a 2v2 practice
        // match. This is a deal constraint, not a set of fixed spawn bands.
        if (
          [0, 1].some((team) => {
            const xs = points
              .slice(team * teamSize, (team + 1) * teamSize)
              .map((p) => p.x);
            return (
              Math.min(...xs) >= this.width / 2 ||
              Math.max(...xs) <= this.width / 2 ||
              Math.max(...xs) - Math.min(...xs) < this.width * 0.35
            );
          })
        )
          continue;
        const order = points
          .map((p, id) => ({ ...p, team: id < teamSize ? 0 : 1 }))
          .sort((a, b) => a.x - b.x);
        const changes = order
          .slice(1)
          .filter((p, i) => p.team !== order[i].team).length;
        if (changes < (teamSize >= 3 ? 3 : 2)) continue;
        return points;
      }
    }
    throw new Error("Could not find safe scattered starting positions.");
  }

  carve(cx: number, cy: number, radius: number, update = true): number {
    let changed = 0;
    const x0 = Math.max(0, Math.floor(cx - radius)),
      x1 = Math.min(this.width - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius)),
      y1 = Math.min(this.height - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > radius ** 2) continue;
        const i = y * this.width + x;
        if (this.cells[i]) {
          this.cells[i] = 0;
          changed++;
        }
      }
    }
    if (changed && update) this.revision++;
    return changed;
  }

  rectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    material = 2,
  ): void {
    for (
      let iy = Math.max(0, Math.floor(y));
      iy < Math.min(this.height, Math.ceil(y + height));
      iy++
    ) {
      for (
        let ix = Math.max(0, Math.floor(x));
        ix < Math.min(this.width, Math.ceil(x + width));
        ix++
      ) {
        this.cells[iy * this.width + ix] = material;
        this.tops[ix] = Math.min(this.tops[ix], iy);
      }
    }
    this.revision++;
  }

  surface(x: number, from = 0): number {
    for (let y = Math.max(0, Math.floor(from)); y < this.height; y++)
      if (this.solid(x, y)) return y;
    return this.height;
  }

  circleCollides(cx: number, cy: number, radius: number): boolean {
    let highest = this.height;
    for (
      let x = Math.max(0, Math.floor(cx - radius));
      x <= Math.min(this.width - 1, Math.floor(cx + radius));
      x++
    )
      highest = Math.min(highest, this.tops[x]);
    if (cy + radius < highest) return false;
    for (let y = Math.floor(cy - radius); y <= Math.floor(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.floor(cx + radius); x++) {
        if (!this.solid(x, y)) continue;
        const dx = Math.max(x - cx, 0, cx - (x + 1));
        const dy = Math.max(y - cy, 0, cy - (y + 1));
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
    return false;
  }

  /** Weighted contact normals average the pixel stair-steps into a surface.
   * A skin samples nearby contact without changing the collision boundary. */
  // Ground classification samples only the lower cap. A nearby ceiling or
  // upper-body wall must not cancel a valid floor contact.
  bodyContact(
    cx: number,
    feet: number,
    skin = 1.2,
  ): { x: number; y: number } | null {
    const radius = WORM_RADIUS + skin;
    let normalX = 0,
      normalY = 0;
    for (
      let y = Math.floor(feet - WORM_RADIUS);
      y <= Math.ceil(feet + skin);
      y++
    )
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        if (!this.solid(x, y)) continue;
        const py = y + 0.5;
        const closestY = Math.max(
          feet - WORM_HEIGHT + WORM_RADIUS,
          Math.min(feet - WORM_RADIUS, py),
        );
        const dx = cx - (x + 0.5),
          dy = closestY - py;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius || distance < 0.0001) continue;
        const weight = radius - distance;
        normalX += (dx / distance) * weight;
        normalY += (dy / distance) * weight;
      }
    const length = Math.hypot(normalX, normalY);
    return length > 0.0001
      ? { x: normalX / length, y: normalY / length }
      : null;
  }

  circleContact(
    cx: number,
    cy: number,
    radius: number,
    skin = 0.7,
  ): { x: number; y: number } | null {
    const reach = radius + skin;
    let normalX = 0,
      normalY = 0;
    for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++)
      for (let x = Math.floor(cx - reach); x <= Math.ceil(cx + reach); x++) {
        if (!this.solid(x, y)) continue;
        const dx = cx - Math.max(x, Math.min(cx, x + 1));
        const dy = cy - Math.max(y, Math.min(cy, y + 1));
        const distance = Math.hypot(dx, dy);
        if (distance >= reach || distance < 0.0001) continue;
        const weight = reach - distance;
        normalX += (dx / distance) * weight;
        normalY += (dy / distance) * weight;
      }
    const length = Math.hypot(normalX, normalY);
    return length > 0.0001
      ? { x: normalX / length, y: normalY / length }
      : null;
  }

  bodyCollides(cx: number, feet: number): boolean {
    // Capsule = two radius-9 circles and the rectangle between their centers.
    for (let y = Math.floor(feet - WORM_HEIGHT); y < Math.ceil(feet); y++) {
      for (
        let x = Math.floor(cx - WORM_RADIUS);
        x < Math.ceil(cx + WORM_RADIUS);
        x++
      ) {
        if (!this.solid(x, y)) continue;
        const closestY = Math.max(
          feet - WORM_HEIGHT + WORM_RADIUS,
          Math.min(feet - WORM_RADIUS, y + 0.5),
        );
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - closestY) ** 2 < WORM_RADIUS ** 2)
          return true;
      }
    }
    return false;
  }
}
