import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { giraffeStrokesFixture } from "@/components/canvas/_fixtures/strokes.fixture";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { playersFixture, roomCodeFixture } from "@/components/room/_fixtures/players.fixture";
import type { RoomViewState } from "@/components/room/_types/room.types";
import type { PhaseView } from "@/protocol/generated/PhaseView";
import type { RoundResult } from "@/protocol/generated/RoundResult";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { StrokeView } from "@/protocol/generated/StrokeView";
import { RoomStateUtils } from "@/protocol/roomState.utils";

/** The giraffe drawing as the server sends strokes. */
export const strokeViewsFixture: StrokeView[] = giraffeStrokesFixture.map((stroke, index) => ({
  id: index + 1,
  playerId: stroke.playerId,
  colour: stroke.color,
  size: CanvasTools.brushes.find((brush) => brush.size === stroke.size)?.id ?? "medium",
  points: stroke.points,
  done: true,
}));

/** A round as Juno's phone sees it: Pip is drawing the first of three turns each. */
export function roundFixture(patch: Partial<RoundView> = {}): RoundView {
  return {
    number: 1,
    rounds: 5,
    category: "Animals",
    word: "Giraffe",
    role: "artist",
    turnOrder: playersFixture.map((player) => player.id),
    activePlayerId: 1,
    turnRemainingMs: 15_000,
    turn: 1,
    turnsPerPlayer: 3,
    strokes: strokeViewsFixture,
    suspicions: [],
    voted: [],
    yourVote: null,
    ...patch,
  };
}

/** Round one is over: Mo was the bamboozler, guessed wrong, and Pip and Kiki caught them. */
export function resultFixture(patch: Partial<RoundResult> = {}): RoundResult {
  return {
    number: 1,
    rounds: 5,
    gameOver: false,
    category: "Animals",
    word: "Giraffe",
    bamboozlerId: 3,
    guess: "Horse",
    guessCorrect: false,
    votes: [
      { voterId: 1, suspectId: 3 },
      { voterId: 2, suspectId: 4 },
      { voterId: 4, suspectId: 3 },
      { voterId: 3, suspectId: 1 },
    ],
    awards: [
      { playerId: 1, reason: "caughtTheBamboozler", points: 1 },
      { playerId: 4, reason: "caughtTheBamboozler", points: 1 },
    ],
    scores: playersFixture.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.id === 1 || player.id === 4 ? 1 : 0,
      connected: true,
      avatar: AvatarUtils.toWire(player.avatar),
      ready: true,
    })),
    ...patch,
  };
}

type Options = {
  /** Whose device: a player id, or null for a host screen. Juno by default. */
  you?: number | null;
  /** The host player; leave out with `hostScreen`. */
  hostId?: number | null;
  /** Who hosts the room on a screen (`hostRoom`). */
  hostScreen?: string | null;
  phase?: PhaseView;
  players?: number;
};

/**
 * A device's room state in any phase, built the way the server's messages build it, with the countdowns starting
 * now. Call it when the story renders, so the clocks haven't run out yet.
 */
export function roomStateFixture({
  you = 2,
  hostScreen = null,
  hostId = hostScreen ? null : 2,
  phase = { phase: "lobby" },
  players = 6,
}: Options = {}) {
  const now = Date.now();
  const at = (ms: number) => ({ endsAt: now + ms, totalMs: ms });
  const seats = playersFixture.slice(0, players);
  const scores = phase.phase === "finished" ? phase.result.scores : null;
  const state: RoomViewState = {
    ...RoomStateUtils.initial(),
    status: "joined",
    you,
    timers: {
      turn: phase.phase === "drawing" ? at(phase.round.turnRemainingMs) : null,
      voting: phase.phase === "voting" ? at(phase.votingRemainingMs) : null,
      guess: phase.phase === "guessing" ? at(phase.reveal.guessRemainingMs) : null,
    },
    room: {
      code: roomCodeFixture,
      hostId,
      hostScreen,
      players: seats.map(
        (player) =>
          scores?.find((score) => score.id === player.id) ?? {
            id: player.id,
            name: player.name,
            score: 0,
            connected: true,
            avatar: AvatarUtils.toWire(player.avatar),
            ready: true,
          },
      ),
      settings: {
        mode: "oneStroke",
        turnsPerPlayer: 3,
        turnSeconds: 20,
        rounds: 5,
        language: "en",
        categories: ["Animals", "Food"],
      },
      wordCategories: [],
      phase,
    },
  };
  return state;
}

/** What a host screen gets for the same round: no word, no role, no vote. */
export const hostRound = (patch: Partial<RoundView> = {}) =>
  roundFixture({ word: null, role: null, yourVote: null, ...patch });
