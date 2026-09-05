export type Weapon =
  | "rocket"
  | "grenade"
  | "shove"
  | "bridge"
  | "shotgun"
  | "sniper"
  | "cluster"
  | "dynamite"
  | "mortar"
  | "airstrike"
  | "teleport"
  | "medkit";
export type ProjectileKind =
  | "rocket"
  | "grenade"
  | "cluster"
  | "fragment"
  | "dynamite"
  | "mortar"
  | "airstrike";
export type Category = "Artillery" | "Firearms" | "Explosives" | "Utilities";
export interface WeaponDefinition {
  name: string;
  short: string;
  hint: string;
  category: Category;
  ammo: number;
  mode: "lob" | "direct" | "place" | "self" | "melee";
  damage: string;
  range: string;
  color: string;
}
export const WEAPONS: Record<Weapon, WeaponDefinition> = {
  rocket: {
    name: "Seed Rocket",
    short: "Rocket",
    hint: "Wind catches it. Terrain regrets it.",
    category: "Artillery",
    ammo: -1,
    mode: "lob",
    damage: "56 max",
    range: "Long arc · wind",
    color: "#b7c886",
  },
  grenade: {
    name: "Pebble Popper",
    short: "Grenade",
    hint: "A little bounce. A 3-second fuse.",
    category: "Explosives",
    ammo: -1,
    mode: "lob",
    damage: "62 max",
    range: "Bounces · 3 s",
    color: "#b7c886",
  },
  shotgun: {
    name: "Bramble Blaster",
    short: "Shotgun",
    hint: "Five pellets. Get close for a proper introduction.",
    category: "Firearms",
    ammo: 4,
    mode: "direct",
    damage: "5 × 12",
    range: "Short · 310 px",
    color: "#e9b882",
  },
  sniper: {
    name: "Needle Rifle",
    short: "Rifle",
    hint: "One straight shot. Soil blocks it; wind does not.",
    category: "Firearms",
    ammo: 3,
    mode: "direct",
    damage: "42 direct",
    range: "Long · line of sight",
    color: "#a7dbe6",
  },
  cluster: {
    name: "Conker Cluster",
    short: "Cluster",
    hint: "Three seconds, then five bouncing surprises.",
    category: "Explosives",
    ammo: 2,
    mode: "lob",
    damage: "26 + 5 × 22",
    range: "Bounces · splits",
    color: "#e2b66a",
  },
  dynamite: {
    name: "Root TNT",
    short: "TNT",
    hint: "Drop it at your feet. Four seconds to reconsider.",
    category: "Explosives",
    ammo: 2,
    mode: "self",
    damage: "85 max",
    range: "Drop · 4 s fuse",
    color: "#f18f78",
  },
  mortar: {
    name: "Acorn Mortar",
    short: "Mortar",
    hint: "A heavy shell with a steep arc and a broad crater.",
    category: "Artillery",
    ammo: 3,
    mode: "lob",
    damage: "72 max",
    range: "Heavy arc · no wind",
    color: "#d7bd8a",
  },
  airstrike: {
    name: "Seed Rain",
    short: "Airstrike",
    hint: "Pick a column. Five shells arrive from above; roofs intercept shells.",
    category: "Artillery",
    ammo: 1,
    mode: "place",
    damage: "5 × 30",
    range: "Anywhere · from sky",
    color: "#c6a5df",
  },
  shove: {
    name: "Spore Shove",
    short: "Shove",
    hint: "Get close. Give gravity a hand.",
    category: "Utilities",
    ammo: 3,
    mode: "melee",
    damage: "15 + knockback",
    range: "Touch · 72 px",
    color: "#c6a5df",
  },
  bridge: {
    name: "Leaf Bridge",
    short: "Bridge",
    hint: "Aim at clear space nearby to place a destructible bridge.",
    category: "Utilities",
    ammo: 2,
    mode: "place",
    damage: "Build a crossing",
    range: "Nearby · 115 px",
    color: "#b7c886",
  },
  teleport: {
    name: "Blink Bulb",
    short: "Teleport",
    hint: "Choose a clear, supported landing within 550 pixels.",
    category: "Utilities",
    ammo: 2,
    mode: "place",
    damage: "Relocate safely",
    range: "550 px · solid footing",
    color: "#a7dbe6",
  },
  medkit: {
    name: "Compost Cure",
    short: "Medkit",
    hint: "Restore up to 35 health. Uses your attack for this turn.",
    category: "Utilities",
    ammo: 1,
    mode: "self",
    damage: "+35 health",
    range: "Self · max 100 HP",
    color: "#f18f78",
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS) as Weapon[];
export const CATEGORIES: Category[] = [
  "Artillery",
  "Firearms",
  "Explosives",
  "Utilities",
];
export const QUICK_DEFAULT: Weapon[] = [
  "rocket",
  "grenade",
  "shotgun",
  "bridge",
];
export function createInventory(): Record<Weapon, number> {
  return Object.fromEntries(
    WEAPON_IDS.map((id) => [id, WEAPONS[id].ammo]),
  ) as Record<Weapon, number>;
}
export const BALLISTICS: Record<
  ProjectileKind,
  {
    speed: number;
    wind: number;
    fuse: number;
    bounce: boolean;
    radius: number;
    damage: number;
  }
> = {
  rocket: {
    speed: 700,
    wind: 1,
    fuse: 0,
    bounce: false,
    radius: 61,
    damage: 56,
  },
  grenade: {
    speed: 535,
    wind: 0.2,
    fuse: 180,
    bounce: true,
    radius: 69,
    damage: 62,
  },
  cluster: {
    speed: 535,
    wind: 0.2,
    fuse: 180,
    bounce: true,
    radius: 36,
    damage: 26,
  },
  fragment: {
    speed: 150,
    wind: 0.2,
    fuse: 60,
    bounce: true,
    radius: 30,
    damage: 22,
  },
  dynamite: {
    speed: 0,
    wind: 0,
    fuse: 240,
    bounce: true,
    radius: 92,
    damage: 85,
  },
  mortar: {
    speed: 490,
    wind: 0,
    fuse: 0,
    bounce: false,
    radius: 80,
    damage: 72,
  },
  airstrike: {
    speed: 0,
    wind: 0.12,
    fuse: 0,
    bounce: false,
    radius: 38,
    damage: 30,
  },
};
