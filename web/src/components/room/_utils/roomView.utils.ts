import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import type { RoomOutcome, RoomPlayer, RoomViewState, RoundScore } from "@/components/room/_types/room.types";
import type { PlayerSummary } from "@/protocol/generated/PlayerSummary";
import type { AwardReason } from "@/protocol/generated/AwardReason";
import type { RejectReason } from "@/protocol/generated/RejectReason";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { Reveal } from "@/protocol/generated/Reveal";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
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
      ready: player.ready,
    };
  });
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** How this room plays, in a few lines: the room's rules card behind the "?" button. */
function rulesOf(settings: RoomSettings): string[] {
  const turns =
    settings.mode === "timed"
      ? `Timed turns: ${settings.turnSeconds} seconds to draw, ${count(LobbySetupUtils.timedTurnsPerPlayer, "turn", "turns")} each per round`
      : `One stroke each: one line per turn, ${count(settings.turnsPerPlayer, "turn", "turns")} each per round`;
  const rounds =
    settings.rounds === 1
      ? "1 round, with a new secret word and a new bamboozler"
      : `${settings.rounds} rounds, each with a new secret word and a new bamboozler`;
  const language = settings.language === "nl" ? "Dutch" : "English";
  return [turns, rounds, `${language} words from ${count(settings.categories.length, "category", "categories")}`];
}

/** What's picked, in one line: the setup's bar, the lobby, the host screen. */
function settingsLine(settings: RoomSettings): string {
  const turns =
    settings.mode === "timed"
      ? [`Timed`, `${settings.turnSeconds} s`, `${count(LobbySetupUtils.timedTurnsPerPlayer, "turn", "turns")} each`]
      : [`One stroke`, `${count(settings.turnsPerPlayer, "turn", "turns")} each`];
  const language = settings.language === "nl" ? "Dutch" : "English";
  return [
    ...turns,
    count(settings.rounds, "round", "rounds"),
    language,
    count(settings.categories.length, "category", "categories"),
  ].join(" · ");
}

/** One player's round: the points and why, as the results list them. */
export type RoundLine = { playerId: number; points: number; reasons: string[] };

/** Who got what this round and why, most points first: "voted Mo ✓", "slipped through", "guessed the word". */
function roundLines(result: RoundResult, players: RoomPlayer[], youId: number | null): RoundLine[] {
  const lines = players.map((player): RoundLine => {
    const awards = result.awards.filter((award) => award.playerId === player.id);
    const points = awards.reduce((sum, award) => sum + award.points, 0);
    const has = (reason: AwardReason) => awards.some((award) => award.reason === reason);
    if (player.id === result.bamboozlerId) {
      const reasons = [has("stayedHidden") ? "slipped through" : "caught"];
      if (has("guessedTheWord")) reasons.push("guessed the word");
      return { playerId: player.id, points, reasons };
    }
    const vote = result.votes.find((cast) => cast.voterId === player.id);
    const reason = vote
      ? `voted ${nameOf(vote.suspectId, players, youId)} ${vote.suspectId === result.bamboozlerId ? "✓" : "✗"}`
      : "didn’t vote";
    return { playerId: player.id, points, reasons: [reason] };
  });
  return lines.sort((a, b) => b.points - a.points);
}

/**
 * What the reveal means for the points: "1 of 3 spotted Sam (+1), so Sam slips through (+1)". Fewer than half of the
 * artists is the server's rule (`score` in room/mod.rs), repeated here only to say it before the results come in.
 */
function spotted(caught: number, artists: number, bamboozler: { name: string; you: boolean }): string {
  const { you } = bamboozler;
  const name = you ? "you" : bamboozler.name;
  if (caught === 0) return `Nobody spotted ${name}! ${you ? "You" : name} +1`;
  if (caught >= artists) return `Everyone spotted ${name}! +1 each${you ? " for them" : ""}`;
  if (caught * 2 < artists)
    return `${caught} of ${artists} spotted ${name} (${caught === 1 ? "+1" : "+1 each"}), so ${name} ${you ? "slip" : "slips"} through (+1)`;
  return `${caught} of ${artists} spotted ${name}: caught! +1 each${you ? " for them" : ""}`;
}

const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n}×`);

/**
 * One fun line per player for the final scores, from every round of the game ("spotted the bamboozler 3×", "slipped
 * through twice"); none when this device didn't see the whole game.
 */
function highlights(history: RoundResult[], playerIds: number[]): Record<number, string> {
  const last = history.at(-1);
  const whole = !!last?.gameOver && history.every((round, index) => round.number === index + 1);
  if (!whole) return {};
  const count = (playerId: number, reason: AwardReason) =>
    history.flatMap((round) => round.awards).filter((award) => award.playerId === playerId && award.reason === reason)
      .length;
  return Object.fromEntries(
    playerIds.map((playerId) => {
      const [caught, slipped, guessed] = [
        count(playerId, "caughtTheBamboozler"),
        count(playerId, "stayedHidden"),
        count(playerId, "guessedTheWord"),
      ];
      const bluffed = history.filter((round) => round.bamboozlerId === playerId).length;
      const facts = [
        caught > 0 && `spotted the bamboozler ${times(caught)}`,
        slipped > 0 && `slipped through ${times(slipped)}`,
        guessed > 0 && `guessed the word ${times(guessed)}`,
      ].filter((fact) => fact !== false);
      if (facts.length === 0)
        facts.push(bluffed > 0 && slipped === 0 ? "caught on every bluff" : "never spotted the bamboozler");
      return [playerId, facts.slice(0, 2).join(", ")];
    }),
  );
}

/** A player as the viewer reads them: "you" for yourself. */
const nameOf = (id: number, players: RoomPlayer[], youId: number | null) =>
  id === youId ? "you" : (players.find((player) => player.id === id)?.name ?? "?");

/** "you", "you and Noor", "Noor, Jip and 2 more": you first, then in the order given. */
function names(ids: number[], players: RoomPlayer[], youId: number | null): string {
  const all = [...ids]
    .sort((a, b) => Number(b === youId) - Number(a === youId))
    .map((id) => nameOf(id, players, youId));
  if (all.length <= 2) return all.join(" and ");
  return `${all.slice(0, 2).join(", ")} and ${all.length - 2} more`;
}

/** Same as the server: `MIN_PLAYERS_TO_START` and `MAX_PLAYERS` in limits.rs. */
const MIN_PLAYERS_TO_START = 3;
const MAX_PLAYERS = 8;
/** Who a room is for, as the start page and the setup say it. */
const playerCount = `${MIN_PLAYERS_TO_START} to ${MAX_PLAYERS} players`;

/** Why a round can't start yet (too few players here), or null when it can. */
function waitingForPlayers(players: RoomPlayer[]): string | null {
  const here = players.filter((player) => player.connected).length;
  const missing = MIN_PLAYERS_TO_START - here;
  if (missing <= 0) return null;
  return `Waiting for at least ${missing} more ${missing === 1 ? "player" : "players"} (${playerCount} can play)`;
}

/** For the host in the lobby: who's still drawing their face, or null when everyone's in. */
function stillOnTheirFace(players: RoomPlayer[]): string | null {
  const names = players.filter((player) => !player.ready).map((player) => player.name);
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is still drawing their face`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are still drawing their faces`;
  return `${names.length} players are still drawing their faces`;
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
  stillOnTheirFace,
  nameOf,
  names,
  waitingForPlayers,
  playerCount,
  rulesOf,
  settingsLine,
  roundLines,
  spotted,
  highlights,
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
};
