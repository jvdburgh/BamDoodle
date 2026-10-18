import type { TurnMode } from "@/protocol/generated/TurnMode";

export type RoomPlayer = {
  id: string;
  name: string;
  /** Seed for the placeholder doodle avatar. */
  avatarSeed: number;
};

export type { TurnMode };

/** In the prototype: you play one seat and the others are simulated, or everyone passes one device round. */
export type Seats = "simulated" | "shared";

/** Free colours for everyone, or one shade family per player: the attribution question the prototype compares. */
export type Attribution = "free" | "shades";

export type RoundPhase = "waiting" | "drawing" | "over";

export type Round = {
  mode: TurnMode;
  phase: RoundPhase;
  /** Turns started this round; the active player is `turnCount % players`. */
  turnCount: number;
  /** How long the round lasts; a room setting. */
  roundMs: number;
  roundStartedAt: number;
  turnStartedAt: number;
};
