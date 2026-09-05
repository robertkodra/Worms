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
