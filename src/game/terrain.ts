export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;
export const INITIAL_WATER = 802;
export const WORM_RADIUS = 9;
export const WORM_HEIGHT = 28;

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
  spawnXs: number[] = [265, 535, 1080, 1360];

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

  generate(seed: number, teamSize: 2 | 4 = 4): void {
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
    // Deep seeded cave chains change underground routes without removing spawn support.
    for (let i = 0; i < 5; i++) {
      const x = 170 + random() * (this.width - 340);
      const surface = this.surface(x);
      if (surface > 710) continue;
      const y = Math.min(755, surface + 135 + random() * 65);
      const radius = 32 + random() * 33;
      this.carve(x, y, radius, false);
      if (random() > 0.4)
        this.carve(x + radius * 0.9, y + 12, radius * 0.65, false);
    }
    // Separated supported shelves with comparable margins at both world edges.
    const bands =
      teamSize === 4
        ? [
            [180, 220],
            [290, 330],
            [480, 550],
            [635, 695],
            [905, 965],
            [1050, 1120],
            [1270, 1310],
            [1380, 1420],
          ]
        : [
            [180, 340],
            [485, 685],
            [930, 1120],
            [1260, 1420],
          ];
    this.spawnXs = bands.map(([lo, hi]) => {
      const preferred = lo + random() * (hi - lo);
      let best = (lo + hi) / 2,
        score = Infinity;
      for (let x = lo; x <= hi; x += 2) {
        const y = this.surface(x);
        const l = this.surface(x - 18),
          r = this.surface(x + 18);
        if (Math.max(y, l, r) > INITIAL_WATER - 110) continue;
        const cost = Math.abs(x - preferred) * 0.12 + Math.abs(l - r);
        if (cost < score) {
          best = x;
          score = cost;
        }
      }
      return best;
    });
    this.revision++;
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
