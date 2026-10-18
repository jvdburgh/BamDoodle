import type { Language } from "@/protocol/generated/Language";
import type { TurnMode } from "@/protocol/generated/TurnMode";
import type { WordCategory } from "@/protocol/generated/WordCategory";

export type RoomPlayer = {
  id: string;
  name: string;
  /** Seed for the placeholder doodle avatar. */
  avatarSeed: number;
};

export type { TurnMode };

/** Free colours for everyone, or one shade family per player: the attribution question the prototype compares. */
export type Attribution = "free" | "shades";

export type WordLanguage = Language;

/** What the host picks before the first round (docs/game-rules.md, "A round"). */
export type RoomSetup = {
  mode: TurnMode;
  /** How many times each player draws in "One stroke each"; Timed turns use a fixed two for now. */
  turnsPerPlayer: number;
  /** Seconds per turn in Timed turns. */
  turnSeconds: number;
  rounds: number;
  attribution: Attribution;
  language: WordLanguage;
  /** The word categories in play, by name in the room's language; at least one. 18+ ones are categories too. */
  categories: string[];
};

/** A category with its words, as the playground deals them; the server's `WordCategory` only carries the count. */
export type WordPack = Omit<WordCategory, "words"> & { words: string[] };

/**
 * waiting → drawing (turns go round for the laps) → voting (30 s final vote) → reveal (the bamboozler and the votes)
 * → guess (the bamboozler's one try at the word) → results (points, then the host starts the next round).
 */
export type RoundPhase = "waiting" | "drawing" | "voting" | "reveal" | "guess" | "results";

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
  bamboozlerId: string;
  /** Who each player currently suspects; public and changeable while drawing. */
  suspicions: Record<string, string>;
  /** Locked final votes. */
  votes: Record<string, string>;
  guess: { text: string; right: boolean } | null;
};
