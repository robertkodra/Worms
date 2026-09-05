export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;
export const INITIAL_WATER = 802;
export const WORM_RADIUS = 9;
export const WORM_HEIGHT = 28;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Terrain {
  readonly cells: Uint8Array;
  readonly tops: Int32Array;
  revision = 0;

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

  generate(seed: number): void {
    this.cells.fill(0);
    this.tops.fill(this.height);
    const random = seededRandom(seed);
    const phase = random() * Math.PI * 2;
    for (let x = 54; x < this.width - 54; x++) {
      // Two substantial islands and a narrow central channel. Spawn shelves
      // remain broad; caves are carved well below their supporting surfaces.
      if (x > 776 && x < 824) continue;
      const side = x < 800 ? 0 : 1;
      const local = side === 0 ? x : this.width - x;
      const edge = Math.max(0, (110 - local) * 0.9);
      const top = Math.round(
        510 +
          49 * Math.sin(x * 0.005 + phase) +
          24 * Math.sin(x * 0.013 + phase * 0.3) +
          edge,
      );
      const bottom = 858 - Math.max(0, 100 - local) * 0.6;
      this.tops[x] = top;
      for (let y = top; y < bottom; y++) this.cells[y * this.width + x] = 1;
    }
    this.carve(435, 685, 68, false);
    this.carve(499, 695, 47, false);
    this.carve(1180, 710, 77, false);
    this.carve(1118, 725, 46, false);
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
