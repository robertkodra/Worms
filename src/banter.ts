import { GameEvent } from "./game/simulation";

export const BANTER: Record<string, string[]> = {
  turn: [
    "Right. Small steps.",
    "My turn to improve the view.",
    "All right, who moved the horizon?",
    "Confidence first. Accuracy later.",
  ],
  hit: [
    "Special delivery. No signature needed!",
    "That was almost deliberate!",
    "You've got a little crater on you.",
    "Direct hit. Very indirect apology.",
    "Oh good, the maths worked!",
    "Consider yourself thoroughly gardened.",
  ],
  miss: [
    "Who put the target over there?",
    "That was a warning. To the scenery.",
    "I was aiming for next Thursday.",
    "Wind. Definitely the wind.",
    "Excellent shot. Wrong postcode.",
    "Nobody saw that. Especially the target.",
    "Testing gravity. Still works!",
  ],
  friendly: [
    "Same team! Check the scarf!",
    "That apology is going to need a basket.",
    "Friendly fire. Unfriendly review.",
    "I owe you a new hat.",
  ],
  skip: [
    "A tactical pause. Very tactical.",
    "I'll let the suspense do the damage.",
    "Just checking the soil.",
  ],
  utility: [
    "Temporary confidence installed.",
    "A small improvement to my situation.",
    "Try reaching me now!",
  ],
  heal: [
    "A little compost. Good as new.",
    "Medic! Oh wait, that's me.",
    "Back in business. Slightly damp.",
  ],
};

/** Outcome lines beat turn greetings in the same event batch. No hit call on a miss. */
export function chatterEvent(events: GameEvent[]): GameEvent | undefined {
  return (
    events.find((e) => e.type === "outcome") ??
    events.find((e) => e.type === "turn")
  );
}
export function chatterKey(event: GameEvent): string {
  return event.type === "outcome" ? (event.outcome ?? "skip") : event.type;
}
