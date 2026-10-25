import type { RoomPhase } from "@/components/room/_types/room.types";

export type SoundCue =
  | "start"
  | "turn"
  | "yourTurn"
  | "tick"
  | "voteTick"
  | "timeUp"
  | "reveal"
  | "fanfare"
  | "pick"
  | "scribble"
  | "suspect"
  | "vote"
  | "tap";

/** What the room looks like at one moment, as far as sound cares. */
export type SoundMoment = {
  phase: RoomPhase;
  turnCount: number;
  yourTurn: boolean;
  /** Whole seconds left in the turn, rounded up as the clocks show them. */
  turnSeconds: number;
  /** Whole seconds left in the vote. */
  voteSeconds: number;
};

const TURN_TICKS_FROM = 3;
const VOTE_TICKS_FROM = 5;

/**
 * The cues to play going from one moment to the next: a jingle when drawing starts, a blip per turn (brighter when
 * it's yours), ticks in a turn's last seconds, "time's up" when the final vote opens, ticks in the vote's last
 * seconds, and a drumroll-ish reveal.
 */
function between(before: SoundMoment, after: SoundMoment): SoundCue[] {
  if (before.phase !== after.phase) {
    if (after.phase === "drawing") return ["start"];
    if (after.phase === "voting") return ["timeUp"];
    if (after.phase === "guessing") return ["reveal"];
    return [];
  }
  if (after.phase === "voting") {
    const tick = after.voteSeconds < before.voteSeconds && after.voteSeconds <= VOTE_TICKS_FROM;
    return tick ? ["voteTick"] : [];
  }
  if (after.phase !== "drawing") return [];
  if (after.turnCount !== before.turnCount) return [after.yourTurn ? "yourTurn" : "turn"];
  const tick = after.turnSeconds < before.turnSeconds && after.turnSeconds <= TURN_TICKS_FROM;
  return tick ? ["tick"] : [];
}

/** What a click asks about the element pressed. A control with its own sound says so with `data-sound="own"`. */
const pressSelectors = {
  own: '[data-sound="own"]',
  choice: "input[type=radio], input[type=checkbox]",
  button: 'button:not([aria-disabled="true"])',
} as const;

/** The sound for a click: a tap for a button, a pick for a choice (a radio or checkbox), nothing for the rest. */
function forPress(target: Pick<Element, "closest"> | null): SoundCue | null {
  if (!target || target.closest(pressSelectors.own)) return null;
  if (target.closest(pressSelectors.choice)) return "pick";
  if (target.closest(pressSelectors.button)) return "tap";
  return null;
}

export const SoundCuesUtils = { between, forPress, pressSelectors };
