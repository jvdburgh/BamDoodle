import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import type { PhaseView } from "@/protocol/generated/PhaseView";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { RoomState } from "@/protocol/roomState.utils";

export type RoomPlayer = {
  /** The server's player id. */
  id: number;
  name: string;
  /** Seed for this player's hand-drawn marks (rings, magnifier), so they wobble the same on every render. */
  avatarSeed: number;
  avatar: AvatarStroke[];
  /** False while their device is away. */
  connected: boolean;
};

/**
 * Free colours for everyone, or one shade family per player: the attribution question the lab compares. Real rooms
 * are free until the server has the setting.
 */
export type Attribution = "free" | "shades";

/** The server's phase: lobby → drawing → voting → guessing (the reveal and the bamboozler's guess) → finished. */
export type RoomPhase = PhaseView["phase"];

/** One player's round on the results: points, and whether they got it right (an award says they did). */
export type RoundScore = { points: number; right: boolean };

/**
 * What the player cards show after the vote: the bamboozler (in the hat) and who each player voted for; once the
 * round is scored, the points and the totals too.
 */
export type RoomOutcome = {
  bamboozlerId: number;
  /** Final votes: voter → suspect. */
  votes: Record<number, number>;
  scores?: Record<number, RoundScore>;
  totals?: Record<number, number>;
};

/** A public fact for the table talk; each screen words it for its viewer. */
export type FeedLine = {
  id: number;
  at: number;
  voterId: number;
} & ({ kind: "suspect"; suspectId: number | null; beforeId: number | null } | { kind: "voted" });

/** A device's room state once the server has sent the room: what the room screens render. */
export type RoomViewState = RoomState & { room: RoomSnapshot };
