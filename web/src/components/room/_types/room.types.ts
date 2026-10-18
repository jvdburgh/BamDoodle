import type { TurnMode } from "@/protocol/generated/TurnMode";

export type RoomPlayer = {
  id: string;
  name: string;
  /** Seed for the placeholder doodle avatar. */
  avatarSeed: number;
};

export type { TurnMode };

/** Free colours for everyone, or one shade family per player: the attribution question the prototype compares. */
export type Attribution = "free" | "shades";

export type WordLanguage = "en" | "nl";

/** What the host picks before the first round (docs/game-rules.md, "A round"). */
export type RoomSetup = {
  mode: TurnMode;
  /** Laps of one stroke each; Timed turns use a fixed two laps for now. */
  laps: number;
  /** Seconds per turn in Timed turns. */
  turnSeconds: number;
  rounds: number;
  attribution: Attribution;
  language: WordLanguage;
  adults: boolean;
};

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
  /** Laps × players: when the drawing stops. */
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
