import type { Attribution } from "@/components/room/_types/room.types";
import type { Language } from "@/protocol/generated/Language";
import type { TurnMode } from "@/protocol/generated/TurnMode";
import type { WordCategory } from "@/protocol/generated/WordCategory";

/** What the host picks before the first round, plus the lab-only colours switch. */
export type RoomSetup = {
  mode: TurnMode;
  /** How many times each player draws in "One stroke each"; Timed turns use a fixed two. */
  turnsPerPlayer: number;
  /** Seconds per turn in Timed turns. */
  turnSeconds: number;
  rounds: number;
  attribution: Attribution;
  language: Language;
  /** The word categories in play, by name in the room's language; at least one. 18+ ones are categories too. */
  categories: string[];
};

/** A category with its words, as the lab deals them; the server's `WordCategory` only carries the count. */
export type WordPack = Omit<WordCategory, "words"> & { words: string[] };

export type WordCard = { category: string; word: string };

/**
 * The simulation's own steps: waiting → drawing (turns go round) → voting (30 s final vote) → guess (the reveal and
 * the bamboozler's guess) → results. The views see them as the server's phases (`LabRoomUtils.toState`).
 */
export type RoundPhase = "waiting" | "drawing" | "voting" | "guess" | "results";

export type Round = {
  mode: TurnMode;
  phase: RoundPhase;
  /** Turns started this round; the active player is `turnCount % players`. */
  turnCount: number;
  /** Turns per player × players: when the drawing stops. */
  totalTurns: number;
  turnMs: number;
  turnStartedAt: number;
  /** When the current phase started, for the voting and guessing countdowns. */
  phaseStartedAt: number;
  bamboozlerId: number;
  /** Who each player currently suspects; public and changeable while drawing. */
  suspicions: Record<number, number>;
  /** Locked final votes. */
  votes: Record<number, number>;
  guess: { text: string; right: boolean } | null;
};
