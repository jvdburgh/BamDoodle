export type SoundCue = "start" | "turn" | "yourTurn" | "tick" | "roundTick" | "timeUp" | "pick" | "scribble" | "vote";

/** What the room looks like at one moment, as far as sound cares. */
export type SoundMoment = {
  phase: "waiting" | "drawing" | "over";
  turnCount: number;
  yourTurn: boolean;
  /** Whole seconds left, rounded up as the clocks show them. */
  turnSeconds: number;
  roundSeconds: number;
};

const TURN_TICKS_FROM = 3;
const ROUND_TICKS_FROM = 5;

/**
 * The cues to play going from one moment to the next: a start jingle, a blip per turn (a brighter one when it's
 * yours), ticks in the last seconds of a turn or the round, and a chime when time's up. In the round's last seconds
 * only the round ticks, even when the turn's clock is out of step with it.
 */
function between(before: SoundMoment, after: SoundMoment): SoundCue[] {
  if (before.phase === "waiting" && after.phase === "drawing") return ["start"];
  if (before.phase === "drawing" && after.phase === "over") return ["timeUp"];
  if (after.phase !== "drawing") return [];

  const cues: SoundCue[] = [];
  if (after.turnCount !== before.turnCount) cues.push(after.yourTurn ? "yourTurn" : "turn");

  const roundTick = after.roundSeconds < before.roundSeconds && after.roundSeconds <= ROUND_TICKS_FROM;
  const turnTick =
    after.roundSeconds > ROUND_TICKS_FROM &&
    after.turnCount === before.turnCount &&
    after.turnSeconds < before.turnSeconds &&
    after.turnSeconds <= TURN_TICKS_FROM;
  if (roundTick) cues.push("roundTick");
  else if (turnTick) cues.push("tick");
  return cues;
}

export const SoundCuesUtils = { between };
