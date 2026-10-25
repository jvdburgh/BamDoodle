import type { RoomPhase } from "@/components/room/_types/room.types";
import type { Award } from "@/protocol/generated/Award";
import type { PlayerSummary } from "@/protocol/generated/PlayerSummary";
import type { Role } from "@/protocol/generated/Role";
import type { Vote } from "@/protocol/generated/Vote";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";

export type SoundCue =
  | "start"
  | "turn"
  | "yourTurn"
  | "tick"
  | "voteTick"
  | "timeUp"
  | "reveal"
  | "fanfare"
  | "caughtThem"
  | "fooled"
  | "slippedThrough"
  | "busted"
  | "guessedIt"
  | "nailedIt"
  | "nope"
  | "coin"
  | "win"
  | "goodGame"
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
  /** Who's listening: none on a host screen. */
  you: number | null;
  /** Your part in the round being played: none on a host screen, between rounds, or if you joined after it began. */
  role: Role | null;
  /** Once the vote is over: the bamboozler, everyone's final vote, and how many artists played. */
  reveal: { bamboozlerId: number; votes: Vote[]; artists: number } | null;
  /** The round, once it's scored. */
  result: {
    guessCorrect: boolean;
    gameOver: boolean;
    awards: Award[];
    scores: Pick<PlayerSummary, "id" | "score">[];
  } | null;
};

const TURN_TICKS_FROM = 3;
const VOTE_TICKS_FROM = 5;

/**
 * How the vote went for you, by your part in the round: you caught the bamboozler or were fooled (a wrong vote or
 * none); as the bamboozler, you slipped through (fewer than half the artists voted for you, as the server scores it)
 * or were busted. Nothing on a host screen or for someone who wasn't in the round.
 */
function forReveal(role: Role | null, you: number | null, reveal: NonNullable<SoundMoment["reveal"]>): SoundCue[] {
  const { bamboozlerId, votes, artists } = reveal;
  if (role === "artist") {
    const caught = votes.some((vote) => vote.voterId === you && vote.suspectId === bamboozlerId);
    return [caught ? "caughtThem" : "fooled"];
  }
  if (role === "bamboozler") {
    const caughtBy = votes.filter((vote) => vote.suspectId === bamboozlerId && vote.voterId !== bamboozlerId).length;
    return [RoomViewUtils.slipsThrough(caughtBy, artists) ? "slippedThrough" : "busted"];
  }
  return [];
}

/**
 * The end of a round, in order: the bamboozler's guess for everyone (their own victory when it's you), a coin if you
 * scored, and after the last round a win if you're on top (ties too) or a good game; the fanfare on a host screen and
 * for someone who wasn't in that round.
 */
function forResult(role: Role | null, you: number | null, result: NonNullable<SoundMoment["result"]>): SoundCue[] {
  const cues: SoundCue[] = [];
  if (!result.guessCorrect) cues.push("nope");
  else cues.push(role === "bamboozler" ? "nailedIt" : "guessedIt");
  if (result.awards.some((award) => award.playerId === you && award.points > 0)) cues.push("coin");
  if (result.gameOver) {
    const mine = result.scores.find((player) => player.id === you);
    const top = Math.max(...result.scores.map((player) => player.score));
    cues.push(!role || !mine ? "fanfare" : mine.score >= top ? "win" : "goodGame");
  }
  return cues;
}

/**
 * The cues to play going from one moment to the next, in order: a jingle when drawing starts, a blip per turn
 * (brighter when it's yours), ticks in a turn's last seconds, "time's up" when the final vote opens, ticks in the
 * vote's last seconds, a drumroll-ish reveal and how the vote went for you, then how the round ended. Your part is
 * the one you had before the change: a finished round no longer says it.
 */
function between(before: SoundMoment, after: SoundMoment): SoundCue[] {
  if (before.phase !== after.phase) {
    if (after.phase === "drawing") return ["start"];
    if (after.phase === "voting") return ["timeUp"];
    if (after.phase === "guessing") {
      return ["reveal", ...(after.reveal ? forReveal(before.role, after.you, after.reveal) : [])];
    }
    if (after.phase === "finished" && after.result) return forResult(before.role, after.you, after.result);
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
