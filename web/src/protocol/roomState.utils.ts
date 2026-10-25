import type { PhaseView } from "@/protocol/generated/PhaseView";
import type { RejectReason } from "@/protocol/generated/RejectReason";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { ServerMessage } from "@/protocol/generated/ServerMessage";
import type { StrokeView } from "@/protocol/generated/StrokeView";

export type ConnectionStatus = "connecting" | "joined" | "reconnecting" | "failed" | "replaced" | "closed";

/**
 * A deadline on this device's clock (`Date.now()` milliseconds), worked out from the server's "ms remaining", and
 * how long it ran from the start (or from when this device joined, mid-way).
 */
export type Countdown = { endsAt: number; totalMs: number };

export type RoomTimers = {
  turn: Countdown | null;
  voting: Countdown | null;
  guess: Countdown | null;
};

export type RoomState = {
  status: ConnectionStatus;
  /** Why the connection gave up, when `status` is `failed`; `null` there means the server couldn't be reached. */
  failure: RejectReason | null;
  /** Absent for a screen. */
  you: number | null;
  /**
   * This screen hosts the room: its `hostRoom` (or `watchRoom` with the host token) got a session token back. A host
   * screen that was gone too long has handed the role to a player (`hostChanged`).
   */
  hosting: boolean;
  room: RoomSnapshot | null;
  timers: RoomTimers;
  /** The last thing the server turned down, for a short message in the UI. */
  rejection: { reason: RejectReason; at: number } | null;
  /** A final vote sent but not yet confirmed; the server only says *that* you voted. */
  pendingVote: number | null;
};

/** What the server answers a vote it didn't count; the pending vote is void then. */
const voteRejections: ReadonlySet<RejectReason> = new Set(["invalidVote", "wrongPhase"]);

const noTimers: RoomTimers = { turn: null, voting: null, guess: null };

const countdown = (now: number, ms: number): Countdown => ({ endsAt: now + ms, totalMs: ms });

export const RoomStateUtils = {
  initial(): RoomState {
    return {
      status: "connecting",
      failure: null,
      you: null,
      hosting: false,
      room: null,
      timers: noTimers,
      rejection: null,
      pendingVote: null,
    };
  },

  /** The round being drawn, voted on or guessed, if any. */
  round(state: RoomState): RoundView | null {
    const phase = state.room?.phase;
    return phase && "round" in phase ? phase.round : null;
  },

  /** Who `playerId` suspects right now, during the drawing. */
  suspicionOf(state: RoomState, playerId: number): number | null {
    return (
      RoomStateUtils.round(state)?.suspicions.find((suspicion) => suspicion.playerId === playerId)?.suspectId ?? null
    );
  },

  apply(state: RoomState, message: ServerMessage, now: number): RoomState {
    if (message.type === "joined") {
      return {
        ...state,
        you: message.you,
        hosting: message.you === null && message.sessionToken !== null,
        room: message.room,
        timers: timersFor(message.room.phase, now),
        rejection: null,
        pendingVote: null,
      };
    }
    if (message.type === "rejected") {
      return {
        ...state,
        rejection: { reason: message.reason, at: now },
        pendingVote: voteRejections.has(message.reason) ? null : state.pendingVote,
      };
    }
    const room = state.room;
    if (!room) return state;

    switch (message.type) {
      case "playerJoined":
        return withRoom(state, {
          ...room,
          players: [...room.players.filter((player) => player.id !== message.player.id), message.player],
        });
      case "playerConnection":
        return withRoom(state, {
          ...room,
          players: room.players.map((player) =>
            player.id === message.playerId ? { ...player, connected: message.connected } : player,
          ),
        });
      case "playerRemoved":
        return withRoom(state, { ...room, players: room.players.filter((player) => player.id !== message.playerId) });
      case "avatarChanged":
        return withRoom(state, {
          ...room,
          players: room.players.map((player) =>
            player.id === message.playerId ? { ...player, avatar: message.strokes } : player,
          ),
        });
      case "playerReady":
        return withRoom(state, {
          ...room,
          players: room.players.map((player) => (player.id === message.playerId ? { ...player, ready: true } : player)),
        });
      case "hostChanged":
        // Only a player is ever handed the role: a host screen that was gone for good is no longer the host.
        return { ...withRoom(state, { ...room, hostId: message.hostId, hostScreen: false }), hosting: false };
      case "settingsChanged":
        return withRoom(state, { ...room, settings: message.settings });
      case "gameStarted":
        return withRoom(state, { ...room, players: withScores(room.players, message.scores) });
      case "roundStarted": {
        const phase: PhaseView = { phase: "drawing", round: message.round };
        return { ...withRoom(state, { ...room, phase }), timers: timersFor(phase, now), pendingVote: null };
      }
      case "turnStarted":
        return {
          ...updateRound(state, (round) => ({
            ...round,
            activePlayerId: message.playerId,
            turnRemainingMs: message.durationMs,
            turn: message.turn,
          })),
          timers: { ...state.timers, turn: countdown(now, message.durationMs) },
        };
      case "strokeBegun":
        return updateRound(state, (round) => ({
          ...round,
          strokes: [...round.strokes.filter((stroke) => stroke.id !== message.stroke.id), message.stroke],
        }));
      case "strokeExtended":
        return updateStroke(state, message.strokeId, (stroke) => ({
          ...stroke,
          points: [...stroke.points, ...message.points],
        }));
      case "strokeEnded":
        return updateStroke(state, message.strokeId, (stroke) => ({ ...stroke, done: true }));
      case "suspicionChanged":
        return updateRound(state, (round) => ({
          ...round,
          suspicions: [
            ...round.suspicions.filter((suspicion) => suspicion.playerId !== message.playerId),
            ...(message.suspectId === null ? [] : [{ playerId: message.playerId, suspectId: message.suspectId }]),
          ],
        }));
      case "votingStarted": {
        if (room.phase.phase !== "drawing") return state;
        const phase: PhaseView = {
          phase: "voting",
          round: { ...room.phase.round, activePlayerId: null, turnRemainingMs: 0 },
          votingRemainingMs: message.durationMs,
        };
        return { ...withRoom(state, { ...room, phase }), timers: timersFor(phase, now) };
      }
      case "voteCast": {
        const mine = message.voterId === state.you && state.pendingVote !== null;
        const next = updateRound(state, (round) => ({
          ...round,
          voted: round.voted.includes(message.voterId) ? round.voted : [...round.voted, message.voterId],
          yourVote: mine ? state.pendingVote : round.yourVote,
        }));
        return mine ? { ...next, pendingVote: null } : next;
      }
      case "revealed": {
        if (room.phase.phase !== "voting") return state;
        const phase: PhaseView = { phase: "guessing", round: room.phase.round, reveal: message.reveal };
        return { ...withRoom(state, { ...room, phase }), timers: timersFor(phase, now), pendingVote: null };
      }
      case "roundFinished":
        return {
          ...withRoom(state, {
            ...room,
            phase: { phase: "finished", result: message.result, strokes: RoomStateUtils.round(state)?.strokes ?? [] },
            players: withScores(room.players, message.result.scores),
          }),
          timers: noTimers,
          pendingVote: null,
        };
      case "pong":
        return state;
    }
  },

  /** Remembers who you voted for until the server confirms it. */
  withPendingVote(state: RoomState, suspectId: number): RoomState {
    return { ...state, pendingVote: suspectId };
  },

  withStatus(state: RoomState, status: ConnectionStatus, failure: RejectReason | null = null): RoomState {
    return state.status === status && state.failure === failure ? state : { ...state, status, failure };
  },
};

function withRoom(state: RoomState, room: RoomSnapshot): RoomState {
  return { ...state, room };
}

function withScores(players: RoomSnapshot["players"], scores: RoomSnapshot["players"]): RoomSnapshot["players"] {
  const byId = new Map(scores.map((player) => [player.id, player.score]));
  return players.map((player) => ({ ...player, score: byId.get(player.id) ?? player.score }));
}

function updateRound(state: RoomState, update: (round: RoundView) => RoundView): RoomState {
  const room = state.room;
  if (!room || !("round" in room.phase)) return state;
  return withRoom(state, { ...room, phase: { ...room.phase, round: update(room.phase.round) } });
}

function updateStroke(state: RoomState, strokeId: number, update: (stroke: StrokeView) => StrokeView): RoomState {
  return updateRound(state, (round) => ({
    ...round,
    strokes: round.strokes.map((stroke) => (stroke.id === strokeId ? update(stroke) : stroke)),
  }));
}

function timersFor(phase: PhaseView, now: number): RoomTimers {
  switch (phase.phase) {
    case "drawing":
      return { ...noTimers, turn: countdown(now, phase.round.turnRemainingMs) };
    case "voting":
      return { ...noTimers, voting: countdown(now, phase.votingRemainingMs) };
    case "guessing":
      return { ...noTimers, guess: countdown(now, phase.reveal.guessRemainingMs) };
    case "lobby":
    case "finished":
      return noTimers;
  }
}
