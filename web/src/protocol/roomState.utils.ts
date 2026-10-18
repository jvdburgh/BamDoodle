import type { PhaseView } from "@/protocol/generated/PhaseView";
import type { RejectReason } from "@/protocol/generated/RejectReason";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { ServerMessage } from "@/protocol/generated/ServerMessage";
import type { StrokeView } from "@/protocol/generated/StrokeView";

export type ConnectionStatus = "connecting" | "joined" | "reconnecting" | "failed" | "replaced" | "closed";

/** Deadlines on this device's clock (`performance.now()`-style milliseconds), worked out from the server's "ms remaining". */
export type RoomTimers = {
  turnEndsAt: number | null;
  roundEndsAt: number | null;
  guessEndsAt: number | null;
};

export type RoomState = {
  status: ConnectionStatus;
  /** Why the connection gave up, when `status` is `failed`. */
  failure: RejectReason | null;
  /** Absent for a host screen. */
  you: number | null;
  room: RoomSnapshot | null;
  timers: RoomTimers;
  /** The last thing the server turned down, for a short message in the UI. */
  rejection: { reason: RejectReason; at: number } | null;
  /** A vote sent but not yet confirmed; the server only says *that* you voted. */
  pendingVote: number | null;
};

/** What the server answers a vote it didn't count; the pending vote is void then. */
const voteRejections: ReadonlySet<RejectReason> = new Set(["alreadyVoted", "invalidVote", "wrongPhase"]);

const noTimers: RoomTimers = { turnEndsAt: null, roundEndsAt: null, guessEndsAt: null };

export const RoomStateUtils = {
  initial(): RoomState {
    return {
      status: "connecting",
      failure: null,
      you: null,
      room: null,
      timers: noTimers,
      rejection: null,
      pendingVote: null,
    };
  },

  /** The round being drawn or guessed, if any. */
  round(state: RoomState): RoundView | null {
    const phase = state.room?.phase;
    return phase?.phase === "drawing" || phase?.phase === "guessing" ? phase.round : null;
  },

  apply(state: RoomState, message: ServerMessage, now: number): RoomState {
    if (message.type === "joined") {
      return {
        ...state,
        you: message.you,
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
      case "hostChanged":
        return withRoom(state, { ...room, hostId: message.hostId });
      case "settingsChanged":
        return withRoom(state, { ...room, settings: message.settings });
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
          })),
          timers: { ...state.timers, turnEndsAt: now + message.durationMs },
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
        if (room.phase.phase !== "drawing") return state;
        const phase: PhaseView = { phase: "guessing", round: room.phase.round, reveal: message.reveal };
        return { ...withRoom(state, { ...room, phase }), timers: timersFor(phase, now), pendingVote: null };
      }
      case "roundFinished": {
        const scores = new Map(message.result.scores.map((player) => [player.id, player.score]));
        return {
          ...withRoom(state, {
            ...room,
            phase: { phase: "finished", result: message.result },
            players: room.players.map((player) => ({ ...player, score: scores.get(player.id) ?? player.score })),
          }),
          timers: noTimers,
          pendingVote: null,
        };
      }
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

function updateRound(state: RoomState, update: (round: RoundView) => RoundView): RoomState {
  const room = state.room;
  if (!room || (room.phase.phase !== "drawing" && room.phase.phase !== "guessing")) return state;
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
      return {
        turnEndsAt: now + phase.round.turnRemainingMs,
        roundEndsAt: now + phase.round.roundRemainingMs,
        guessEndsAt: null,
      };
    case "guessing":
      return { ...noTimers, guessEndsAt: now + phase.reveal.guessRemainingMs };
    default:
      return noTimers;
  }
}
