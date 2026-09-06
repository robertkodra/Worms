import { Game, GameSnapshot } from "./simulation";
import { WORLD_WIDTH, WORLD_HEIGHT } from "./terrain";
import { WEAPON_IDS } from "./weapons";

export const SAVE_KEY = "burrow-match-v1";
const MAX_LENGTH = 4_000_000;
export const THEMES = ["garden", "canyon", "frost"] as const;
export type Theme = (typeof THEMES)[number];
export interface SavedMatch {
  game: Game;
  theme: Theme;
  savedAt: number;
}

// Run-length encoding keeps the large binary collision map out of JSON arrays.
export function encodeSave(game: Game, theme: Theme): string {
  if (
    game.mode !== "skirmish" ||
    game.phase !== "aim" ||
    game.active.team !== 0 ||
    game.projectiles.length
  )
    throw new Error("Save at the start of a player turn.");
  const snapshot = game.snapshot();
  const runs: number[] = [];
  const cells = snapshot.terrain.cells;
  for (let i = 0; i < cells.length;) {
    const material = cells[i];
    let end = i + 1;
    while (end < cells.length && cells[end] === material) end++;
    runs.push((end - i) * 4 + material);
    i = end;
  }
  const text = JSON.stringify({
    schema: 1,
    savedAt: Date.now(),
    theme,
    snapshot: { ...snapshot, terrain: { ...snapshot.terrain, cells: runs } },
  });
  if (text.length > MAX_LENGTH) throw new Error("This save is too large.");
  return text;
}

function record(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const integer = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const finite = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
function requireValid(condition: unknown): asserts condition {
  if (!condition)
    throw new Error(
      "This saved match is damaged or from another game version.",
    );
}

export function decodeSave(text: string): SavedMatch {
  requireValid(text.length <= MAX_LENGTH);
  const data: unknown = JSON.parse(text);
  requireValid(
    record(data) && data.schema === 1 && THEMES.includes(data.theme),
  );
  requireValid(integer(data.savedAt, 0, Number.MAX_SAFE_INTEGER));
  const s = data.snapshot;
  requireValid(
    record(s) &&
      s.version === 1 &&
      (s.teamSize === 2 || s.teamSize === 3 || s.teamSize === 4),
  );
  requireValid(
    integer(s.seed, 1, 999999) && integer(s.randomState, 0, 0xffffffff),
  );
  requireValid(
    s.mode === "skirmish" &&
      s.phase === "aim" &&
      s.winner === null &&
      s.action === null,
  );
  requireValid(integer(s.turn, 0, 10000) && s.turn % 2 === 0);
  requireValid(
    integer(s.ticks, 0, 100_000_000) && integer(s.turnTicks, 1, 2700),
  );
  requireValid(
    integer(s.retreatTicks, 0, 300) && integer(s.settleTicks, 0, 1000),
  );
  requireValid(finite(s.wind, -100, 100) && finite(s.water, -10000, 802));
  const n = s.teamSize * 2;
  requireValid(Array.isArray(s.worms) && s.worms.length === n);
  for (let i = 0; i < n; i++) {
    const w = s.worms[i];
    requireValid(
      record(w) && w.id === i && w.team === Math.floor(i / s.teamSize),
    );
    requireValid(
      typeof w.name === "string" &&
        w.name.length > 0 &&
        w.name.length <= 16 &&
        !/[\u0000-\u001f\u007f]/.test(w.name),
    );
    for (const key of ["x", "y", "vx", "vy", "fallStart"])
      requireValid(finite(w[key], -10000, 10000));
    requireValid(integer(w.hp, 0, 100) && (w.facing === -1 || w.facing === 1));
    requireValid(w.jumping === undefined || typeof w.jumping === "boolean");
    requireValid(
      typeof w.grounded === "boolean" &&
        finite(w.walk, 0, 1e9) &&
        finite(w.hurt, 0, 1000),
    );
  }
  requireValid(
    integer(s.activeId, 0, s.teamSize - 1) && s.worms[s.activeId].hp > 0,
  );
  requireValid(s.worms.some((w: any) => w.team === 1 && w.hp > 0));
  requireValid(
    Array.isArray(s.rotations) &&
      s.rotations.length === 2 &&
      s.rotations.every((r: unknown) => integer(r, -1, s.teamSize - 1)) &&
      s.rotations[0] === s.activeId,
  );
  requireValid(Array.isArray(s.projectiles) && s.projectiles.length === 0);
  requireValid(
    record(s.stats) &&
      ["shots", "damage", "craters"].every((k) => finite(s.stats[k], 0, 1e9)),
  );
  requireValid(Array.isArray(s.inventory) && s.inventory.length === 2);
  requireValid(
    s.inventory.every(
      (inventory: unknown) =>
        record(inventory) &&
        WEAPON_IDS.every((k) => integer(inventory[k], -1, 99)),
    ),
  );
  const t = s.terrain;
  requireValid(
    record(t) &&
      integer(t.revision, 0, 1e9) &&
      typeof t.layout === "string" &&
      t.layout.length < 80,
  );
  requireValid(
    Array.isArray(t.spawnXs) &&
      t.spawnXs.length === n &&
      t.spawnXs.every((x: unknown) => finite(x, 0, WORLD_WIDTH)),
  );
  // Earlier version-1 saves only stored horizontal spawn coordinates. Their
  // live worm positions and terrain remain authoritative when continuing.
  if (t.spawnPoints !== undefined)
    requireValid(
      Array.isArray(t.spawnPoints) &&
        t.spawnPoints.length === n &&
        t.spawnPoints.every(
          (p: unknown, id: number) =>
            record(p) &&
            finite(p.x, 0, WORLD_WIDTH) &&
            p.x === t.spawnXs[id] &&
            finite(p.y, 0, WORLD_HEIGHT) &&
            typeof p.underground === "boolean" &&
            (p.exitX === null || finite(p.exitX, 0, WORLD_WIDTH)),
        ),
    );
  requireValid(
    Array.isArray(t.cells) && t.cells.length <= WORLD_WIDTH * WORLD_HEIGHT,
  );
  const cells = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
  let cursor = 0;
  for (const run of t.cells) {
    requireValid(integer(run, 4, cells.length * 4 + 2) && run % 4 !== 3);
    const count = Math.floor(run / 4);
    requireValid(cursor + count <= cells.length);
    cells.fill(run % 4, cursor, cursor + count);
    cursor += count;
  }
  requireValid(cursor === cells.length);
  // Whitelist every restored key: storage never gets Object.assign access to
  // the Game prototype or its methods, even if someone edits localStorage.
  const snapshot: GameSnapshot = {
    version: 1,
    seed: s.seed,
    teamSize: s.teamSize,
    mode: "skirmish",
    randomState: s.randomState,
    terrain: {
      cells,
      revision: t.revision,
      layout: t.layout,
      spawnXs: t.spawnXs,
      spawnPoints: t.spawnXs.map((x: number, id: number) => {
        const p = t.spawnPoints?.[id];
        return p
          ? { x: p.x, y: p.y, underground: p.underground, exitX: p.exitX }
          : {
              x,
              y: Math.max(0, Math.min(WORLD_HEIGHT, s.worms[id].y)),
              underground: false,
              exitX: null,
            };
      }),
    },
    worms: s.worms.map((w: any) => ({
      id: w.id,
      name: w.name,
      team: w.team,
      x: w.x,
      y: w.y,
      vx: w.vx,
      vy: w.vy,
      hp: w.hp,
      facing: w.facing,
      grounded: w.grounded,
      jumping: w.jumping ?? false,
      walk: w.walk,
      hurt: w.hurt,
      fallStart: w.fallStart,
    })),
    projectiles: [],
    action: null,
    phase: "aim",
    ticks: s.ticks,
    turnTicks: s.turnTicks,
    retreatTicks: s.retreatTicks,
    settleTicks: s.settleTicks,
    turn: s.turn,
    activeId: s.activeId,
    rotations: s.rotations,
    winner: null,
    wind: s.wind,
    water: s.water,
    stats: {
      shots: s.stats.shots,
      damage: s.stats.damage,
      craters: s.stats.craters,
    },
    inventory: s.inventory.map(
      (i: any) =>
        Object.fromEntries(
          WEAPON_IDS.map((k) => [k, i[k]]),
        ) as GameSnapshot["inventory"][number],
    ),
  };
  return {
    game: Game.restore(snapshot),
    theme: data.theme,
    savedAt: data.savedAt,
  };
}
