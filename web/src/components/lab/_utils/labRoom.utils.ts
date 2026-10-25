import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import type { Round, RoomSetup, WordCard } from "@/components/lab/_types/lab.types";
import { RoundUtils } from "@/components/lab/_utils/round.utils";
import { ScoreUtils } from "@/components/lab/_utils/score.utils";
import type { RoomPlayer, RoomViewState } from "@/components/room/_types/room.types";
import type { PhaseView } from "@/protocol/generated/PhaseView";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { StrokeView } from "@/protocol/generated/StrokeView";
import type { WordCategory } from "@/protocol/generated/WordCategory";
import { RoomStateUtils, type RoomTimers } from "@/protocol/roomState.utils";

/** Everything the simulation knows at one moment. */
export type LabSnapshot = {
  code: string;
  players: RoomPlayer[];
  youId: number;
  setup: RoomSetup;
  wordCategories: WordCategory[];
  round: Round;
  roundNumber: number;
  /** Scores before this round. */
  totals: Record<number, number>;
  word: WordCard;
  strokes: StrokeView[];
  now: number;
};

/** Your phone, or the host screen (no word, no role, no vote). */
export type LabViewer = "player" | "host";

function roundView(sim: LabSnapshot, viewer: LabViewer): RoundView {
  const { round, players, youId, now } = sim;
  const ids = players.map((player) => player.id);
  const you = viewer === "player";
  const youAreBamboozler = you && round.bamboozlerId === youId;
  return {
    number: sim.roundNumber,
    rounds: sim.setup.rounds,
    category: sim.word.category,
    word: you && !youAreBamboozler ? sim.word.word : null,
    role: you ? (youAreBamboozler ? "bamboozler" : "artist") : null,
    turnOrder: ids,
    activePlayerId: round.phase === "drawing" ? (ids[RoundUtils.activeIndex(round, ids.length)] ?? null) : null,
    turnRemainingMs: RoundUtils.turnLeft(round, now),
    turn: Math.min(RoundUtils.turn(round, ids.length), RoundUtils.turnsPerPlayerFor(sim.setup)),
    turnsPerPlayer: RoundUtils.turnsPerPlayerFor(sim.setup),
    strokes: sim.strokes,
    suspicions: Object.entries(round.suspicions).map(([playerId, suspectId]) => ({
      playerId: Number(playerId),
      suspectId,
    })),
    voted: Object.keys(round.votes).map(Number),
    yourVote: you ? (round.votes[youId] ?? null) : null,
  };
}

function phaseView(sim: LabSnapshot, viewer: LabViewer): PhaseView {
  const { round, now } = sim;
  const votes = () =>
    Object.entries(RoundUtils.finalVotes(round)).map(([voterId, suspectId]) => ({
      voterId: Number(voterId),
      suspectId,
    }));
  switch (round.phase) {
    case "waiting":
      return { phase: "lobby" };
    case "drawing":
      return { phase: "drawing", round: roundView(sim, viewer) };
    case "voting":
      return { phase: "voting", round: roundView(sim, viewer), votingRemainingMs: RoundUtils.phaseLeft(round, now) };
    case "guess":
      return {
        phase: "guessing",
        round: roundView(sim, viewer),
        reveal: {
          bamboozlerId: round.bamboozlerId,
          votes: votes(),
          guessRemainingMs: RoundUtils.phaseLeft(round, now),
        },
      };
    case "results": {
      const ids = sim.players.map((player) => player.id);
      const awards = ScoreUtils.awards(round, ids);
      const totals = ScoreUtils.add(sim.totals, awards);
      return {
        phase: "finished",
        strokes: sim.strokes,
        result: {
          number: sim.roundNumber,
          rounds: sim.setup.rounds,
          gameOver: sim.roundNumber >= sim.setup.rounds,
          category: sim.word.category,
          word: sim.word.word,
          bamboozlerId: round.bamboozlerId,
          guess: round.guess?.text ?? null,
          guessCorrect: round.guess?.right ?? false,
          votes: votes(),
          awards,
          scores: sim.players.map((player) => ({
            id: player.id,
            name: player.name,
            score: totals[player.id] ?? 0,
            connected: true,
            avatar: AvatarUtils.toWire(player.avatar),
            ready: true,
          })),
        },
      };
    }
  }
}

function timers(round: Round): RoomTimers {
  const at = (start: number, totalMs: number) => ({ endsAt: start + totalMs, totalMs });
  return {
    turn: round.phase === "drawing" ? at(round.turnStartedAt, round.turnMs) : null,
    voting: round.phase === "voting" ? at(round.phaseStartedAt, RoundUtils.VOTE_MS) : null,
    guess: round.phase === "guess" ? at(round.phaseStartedAt, RoundUtils.GUESS_MS) : null,
  };
}

/** The simulation as a device's room state, the same shape the server's messages build, for one viewer. */
function toState(sim: LabSnapshot, viewer: LabViewer): RoomViewState {
  const phase = phaseView(sim, viewer);
  const scores = phase.phase === "finished" ? phase.result.scores : null;
  const { setup } = sim;
  return {
    ...RoomStateUtils.initial(),
    status: "joined",
    you: viewer === "player" ? sim.youId : null,
    timers: timers(sim.round),
    room: {
      code: sim.code,
      hostId: sim.youId,
      players:
        scores ??
        sim.players.map((player) => ({
          id: player.id,
          name: player.name,
          score: sim.totals[player.id] ?? 0,
          connected: true,
          avatar: AvatarUtils.toWire(player.avatar),
          ready: true,
        })),
      settings: {
        mode: setup.mode,
        turnsPerPlayer: setup.turnsPerPlayer,
        turnSeconds: setup.turnSeconds,
        rounds: setup.rounds,
        language: setup.language,
        categories: setup.categories,
      },
      wordCategories: sim.wordCategories,
      phase,
    },
  };
}

export const LabRoomUtils = { toState };
