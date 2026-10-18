import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { CanvasTools, type CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";
import type {
  Attribution,
  RoomOutcome,
  RoomPlayer,
  RoomViewState,
  RoundScore,
} from "@/components/room/_types/room.types";
import type { PlayerSummary } from "@/protocol/generated/PlayerSummary";
import type { RejectReason } from "@/protocol/generated/RejectReason";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { Reveal } from "@/protocol/generated/Reveal";
import type { RoundResult } from "@/protocol/generated/RoundResult";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { Vote } from "@/protocol/generated/Vote";
import type { RoomState } from "@/protocol/roomState.utils";

/**
 * What the screens show, read off the server's room state. Only rendering: who is up, counts, lookups, ordering. The
 * rules themselves (turns, votes, points) stay on the server.
 */

/** The server has sent the room: the room screens can render it. */
function inRoom(state: RoomState | null): state is RoomViewState {
  return !!state?.room;
}

/** The same small number for the same room and player on every device, for their face and scribbles. */
function seed(code: string, playerId: number): number {
  let hash = 0;
  for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) % 1_000_003;
  return (hash * 7 + playerId * 13) % 1_000_003;
}

/** Players as the screens draw them: the face each one sent, or a seeded doodle face until they do. */
function players(room: Pick<RoomSnapshot, "code" | "players">): RoomPlayer[] {
  return room.players.map((player) => {
    const avatarSeed = seed(room.code, player.id);
    return {
      id: player.id,
      name: player.name,
      avatarSeed,
      avatar: player.avatar.length > 0 ? AvatarUtils.fromWire(player.avatar) : AvatarUtils.face(avatarSeed),
      connected: player.connected,
    };
  });
}

const byId = (players: RoomPlayer[], id: number | null | undefined) =>
  id == null ? undefined : players.find((player) => player.id === id);

/** Who is drawing now. */
function active(round: RoundView | null, players: RoomPlayer[]): RoomPlayer | undefined {
  return byId(players, round?.activePlayerId);
}

/** Who draws after them, if anyone does this round: the server skips players who are away, and so does this. */
function next(round: RoundView | null, players: RoomPlayer[]): RoomPlayer | undefined {
  if (!round || round.activePlayerId === null) return undefined;
  const count = round.turnOrder.length;
  const index = round.turnOrder.indexOf(round.activePlayerId);
  if (index < 0) return undefined;
  const total = count * round.turnsPerPlayer;
  for (let taken = (round.turn - 1) * count + index + 1; taken < total; taken++) {
    const player = byId(players, round.turnOrder[taken % count]);
    if (player?.connected) return player;
  }
  return undefined;
}

/** Changes with every turn, so a turn call-out or a sound plays again. */
function turnCount(round: RoundView | null): number {
  if (!round || round.activePlayerId === null) return 0;
  return (round.turn - 1) * round.turnOrder.length + round.turnOrder.indexOf(round.activePlayerId) + 1;
}

/** How many players suspect each player right now. */
/** Who suspects each player right now: suspect → the players who marked them (public while drawing). */
function suspectedBy(round: RoundView | null): Record<number, number[]> {
  const by: Record<number, number[]> = {};
  for (const { playerId, suspectId } of round?.suspicions ?? []) (by[suspectId] ??= []).push(playerId);
  return by;
}

/** Votes as voter → suspect. */
function votes(list: Vote[]): Record<number, number> {
  return Object.fromEntries(list.map((vote) => [vote.voterId, vote.suspectId]));
}

/** This round's points per player; an award is what makes a player right. */
function roundScores(result: RoundResult): Record<number, RoundScore> {
  const scores: Record<number, RoundScore> = {};
  for (const player of result.scores) scores[player.id] = { points: 0, right: false };
  for (const award of result.awards) {
    const score = scores[award.playerId] ?? { points: 0, right: false };
    scores[award.playerId] = { points: score.points + award.points, right: true };
  }
  return scores;
}

function totals(players: PlayerSummary[]): Record<number, number> {
  return Object.fromEntries(players.map((player) => [player.id, player.score]));
}

/** For the cards after the vote: the reveal, then (once scored) the round's points and the totals. */
function outcome(reveal: Reveal | null, result: RoundResult | null, players: PlayerSummary[]): RoomOutcome | undefined {
  if (result) {
    return {
      bamboozlerId: result.bamboozlerId,
      votes: votes(result.votes),
      scores: roundScores(result),
      totals: totals(players),
    };
  }
  return reveal ? { bamboozlerId: reveal.bamboozlerId, votes: votes(reveal.votes) } : undefined;
}

export type Standing = { playerId: number; total: number; place: number };

/** Highest first; tied players share a place (1, 2, 2, 4). */
function standings(totals: Record<number, number>, playerIds: number[]): Standing[] {
  const sorted = playerIds
    .map((playerId, order) => ({ playerId, total: totals[playerId] ?? 0, order }))
    .sort((a, b) => b.total - a.total || a.order - b.order);
  return sorted.map(({ playerId, total }) => ({
    playerId,
    total,
    place: sorted.findIndex((entry) => entry.total === total) + 1,
  }));
}

/** Each player's shade family by seat, with own colours; null with free colours. */
function families(players: RoomPlayer[], attribution: Attribution): Record<number, CanvasColour[]> | null {
  if (attribution !== "shades") return null;
  const byPlayer: Record<number, CanvasColour[]> = {};
  players.forEach((player, index) => {
    byPlayer[player.id] = CanvasTools.shadeFamilies[index % CanvasTools.shadeFamilies.length] ?? [];
  });
  return byPlayer;
}

/** One colour per player for avatars and pen tags, only when players have shade families. */
function identities(families: Record<number, CanvasColour[]> | null): Record<number, string> | undefined {
  if (!families) return undefined;
  return Object.fromEntries(Object.entries(families).map(([id, family]) => [id, family[2]?.value ?? ""]));
}

const problems: Record<RejectReason, string> = {
  roomNotFound: "There’s no room with that code. Check the code and try again.",
  roomClosed: "This room was closed after 30 minutes without play. Start a new one from the start page.",
  roomFull: "That room is full.",
  tooManyRooms: "The server is full right now. Try again in a bit.",
  invalidName: "That name won’t do. Try another one.",
  nameTaken: "Someone in that room already has that name. Pick another one.",
  notJoined: "You’re not in that room anymore.",
  alreadyJoined: "You’re already in this room.",
  notHost: "Only the host can do that.",
  notEnoughPlayers: "Not enough players yet: wait for more to join.",
  invalidSettings: "Those settings won’t work. Pick at least one category.",
  wrongPhase: "Too late for that now.",
  invalidVote: "You can’t pick that player.",
  notBamboozler: "Only the bamboozler guesses.",
  replaced: "This room is open on another device now.",
};

/** What to tell the player when the server turns something down. */
function problem(reason: RejectReason): string {
  return problems[reason];
}

export const RoomViewUtils = {
  inRoom,
  problem,
  seed,
  players,
  active,
  next,
  turnCount,
  suspectedBy,
  votes,
  roundScores,
  totals,
  outcome,
  standings,
  families,
  identities,
};
