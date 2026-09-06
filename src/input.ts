import type { Game } from "./game/simulation";

export const DEFAULT_BINDINGS = {
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  fire: "KeyF",
  arsenal: "KeyQ",
  recenter: "KeyR",
};
export type Action = keyof typeof DEFAULT_BINDINGS;
export type Bindings = Record<Action, string>;
export const ACTION_LABELS: Record<Action, string> = {
  left: "Move left",
  right: "Move right",
  jump: "Jump / Shift to backflip",
  fire: "Charge / release",
  arsenal: "Open arsenal",
  recenter: "Recenter camera",
};
export function bindable(code: string): boolean {
  return /^Key[A-Z]$/.test(code) || code === "Space";
}
export function readBindings(value: unknown): Bindings {
  if (!value || typeof value !== "object") return { ...DEFAULT_BINDINGS };
  const result = value as Bindings;
  const keys = Object.keys(DEFAULT_BINDINGS) as Action[];
  if (
    !keys.every((k) => typeof result[k] === "string" && bindable(result[k])) ||
    new Set(keys.map((k) => result[k])).size !== keys.length
  )
    return { ...DEFAULT_BINDINGS };
  return Object.fromEntries(keys.map((k) => [k, result[k]])) as Bindings;
}
export function keyLabel(code: string): string {
  return code.replace(/^Key/, "");
}
/** Accept a tap up to 100 ms before landing, once, in the original turn only. */
export class JumpBuffer {
  private pending: {
    game: Game;
    actor: number;
    hp: number;
    turn: number;
    direction: number;
    backflip: boolean;
    ticks: number;
  } | null = null;

  request(game: Game, direction: number, backflip = false): void {
    if (!game.acting || game.active.hp <= 0) return;
    this.pending = {
      game,
      actor: game.activeId,
      hp: game.active.hp,
      turn: game.turn,
      direction,
      backflip,
      ticks: 6,
    };
  }

  clear(): void {
    this.pending = null;
  }

  tick(game: Game): void {
    const p = this.pending;
    if (!p) return;
    if (
      p.game !== game ||
      p.actor !== game.activeId ||
      p.turn !== game.turn ||
      !game.acting ||
      game.active.hp <= 0 ||
      game.active.hp !== p.hp
    ) {
      this.clear();
      return;
    }
    if (game.active.grounded) {
      // A direction pressed together with jump takes priority over mouse aim.
      game.move(p.direction);
      game.jump(p.backflip);
      this.clear();
    } else if (--p.ticks <= 0) this.clear();
  }
}
