import { describe, expect, it } from "vitest";
import type { AvatarStroke } from "@/protocol/generated/AvatarStroke";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { ServerMessage } from "@/protocol/generated/ServerMessage";
import { type RoomState, RoomStateUtils } from "@/protocol/roomState.utils";

const lobby: RoomSnapshot = {
  code: "BKTZ",
  hostId: 1,
  players: [
    { id: 1, name: "Sam", score: 0, connected: true, avatar: [], ready: true },
    { id: 2, name: "Noor", score: 0, connected: true, avatar: [], ready: true },
  ],
  settings: {
    mode: "oneStroke",
    turnsPerPlayer: 3,
    turnSeconds: 20,
    rounds: 5,
    language: "en",
    categories: ["Animals"],
  },
  wordCategories: [{ language: "en", name: "Animals", adult: false, words: 12 }],
  phase: { phase: "lobby" },
};

const round: RoundView = {
  number: 1,
  rounds: 5,
  category: "Animals",
  word: "giraffe",
  role: "artist",
  turnOrder: [2, 1],
  activePlayerId: 2,
  turnRemainingMs: 15_000,
  turn: 1,
  turnsPerPlayer: 3,
  strokes: [],
  suspicions: [],
  voted: [],
  yourVote: null,
};

function play(messages: ServerMessage[], start: RoomState = RoomStateUtils.initial(), now = 1_000): RoomState {
  return messages.reduce((state, message) => RoomStateUtils.apply(state, message, now), start);
}

const joined: ServerMessage = { type: "joined", serverVersion: "dev", you: 1, sessionToken: "token", room: lobby };

describe("RoomStateUtils.apply", () => {
  it("takes the snapshot from joined and ignores everything before it", () => {
    const before = play([{ type: "hostChanged", hostId: 2 }]);
    expect(before.room).toBeNull();

    const state = play([joined]);
    expect(state.you).toBe(1);
    expect(state.room?.code).toBe("BKTZ");
  });

  it("keeps the player list up to date", () => {
    const state = play([
      joined,
      { type: "playerJoined", player: { id: 3, name: "Jip", score: 0, connected: true, avatar: [], ready: true } },
      { type: "playerJoined", player: { id: 3, name: "Jip", score: 0, connected: true, avatar: [], ready: true } },
      { type: "playerConnection", playerId: 2, connected: false },
      { type: "playerRemoved", playerId: 1 },
      { type: "hostChanged", hostId: 2 },
    ]);
    expect(state.room?.players).toEqual([
      { id: 2, name: "Noor", score: 0, connected: false, avatar: [], ready: true },
      { id: 3, name: "Jip", score: 0, connected: true, avatar: [], ready: true },
    ]);
    expect(state.room?.hostId).toBe(2);
  });

  it("swaps in a player's new avatar", () => {
    const strokes = [{ colour: "#ffffff", pressure: false, points: [[0.5, 0.5, 0.5]] }] satisfies AvatarStroke[];
    const state = play([joined, { type: "avatarChanged", playerId: 2, strokes }]);
    expect(state.room?.players.map((player) => player.avatar)).toEqual([[], strokes]);
  });

  it("marks a player ready once they're done with their face", () => {
    const drawingFaces = { ...lobby, players: lobby.players.map((player) => ({ ...player, ready: false })) };
    const state = play([
      { ...joined, room: drawingFaces },
      { type: "playerReady", playerId: 2 },
    ]);
    expect(state.room?.players.map((player) => player.ready)).toEqual([false, true]);
  });

  it("turns remaining times into deadlines on this device's clock", () => {
    const state = play([joined, { type: "roundStarted", round }], undefined, 5_000);
    expect(state.timers).toEqual({ turn: { endsAt: 20_000, totalMs: 15_000 }, voting: null, guess: null });

    const next = RoomStateUtils.apply(state, { type: "turnStarted", playerId: 1, durationMs: 10_000, turn: 2 }, 21_000);
    expect(next.timers.turn).toEqual({ endsAt: 31_000, totalMs: 10_000 });
    expect(RoomStateUtils.round(next)).toMatchObject({ activePlayerId: 1, turn: 2 });
  });

  it("keeps everyone's public suspicions", () => {
    const state = play([
      joined,
      { type: "roundStarted", round },
      { type: "suspicionChanged", playerId: 1, suspectId: 2 },
      { type: "suspicionChanged", playerId: 3, suspectId: 2 },
      { type: "suspicionChanged", playerId: 1, suspectId: 3 },
      { type: "suspicionChanged", playerId: 3, suspectId: null },
    ]);
    expect(RoomStateUtils.round(state)?.suspicions).toEqual([{ playerId: 1, suspectId: 3 }]);
    expect(RoomStateUtils.suspicionOf(state, 1)).toBe(3);
    expect(RoomStateUtils.suspicionOf(state, 3)).toBeNull();
  });

  it("goes to the final vote when the drawing is over", () => {
    const state = play(
      [joined, { type: "roundStarted", round }, { type: "votingStarted", durationMs: 30_000 }],
      undefined,
      2_000,
    );
    expect(state.room?.phase).toMatchObject({ phase: "voting", votingRemainingMs: 30_000 });
    expect(RoomStateUtils.round(state)).toMatchObject({ activePlayerId: null, word: "giraffe" });
    expect(state.timers).toEqual({ turn: null, voting: { endsAt: 32_000, totalMs: 30_000 }, guess: null });
  });

  it("resets scores when a new game starts", () => {
    const scored: ServerMessage = {
      type: "joined",
      serverVersion: "dev",
      you: 1,
      sessionToken: "token",
      room: { ...lobby, players: lobby.players.map((player) => ({ ...player, score: 4 })) },
    };
    const state = play([
      scored,
      {
        type: "gameStarted",
        scores: lobby.players.map((player) => ({ ...player, score: 0 })),
      },
    ]);
    expect(state.room?.players.map((player) => player.score)).toEqual([0, 0]);
  });

  it("builds strokes as they come in", () => {
    const state = play([
      joined,
      { type: "roundStarted", round },
      {
        type: "strokeBegun",
        stroke: { id: 1, playerId: 2, colour: "#f13866", size: "medium", points: [[0.1, 0.1, 0.5]], done: false },
      },
      { type: "strokeExtended", strokeId: 1, points: [[0.2, 0.2, 0.5]] },
      { type: "strokeExtended", strokeId: 99, points: [[0.9, 0.9, 0.5]] },
      { type: "strokeEnded", strokeId: 1 },
    ]);
    expect(RoomStateUtils.round(state)?.strokes).toEqual([
      {
        id: 1,
        playerId: 2,
        colour: "#f13866",
        size: "medium",
        points: [
          [0.1, 0.1, 0.5],
          [0.2, 0.2, 0.5],
        ],
        done: true,
      },
    ]);
  });

  it("leaves the previous state untouched", () => {
    const state = play([joined, { type: "roundStarted", round }]);
    const strokes = RoomStateUtils.round(state)?.strokes;
    RoomStateUtils.apply(
      state,
      { type: "strokeBegun", stroke: { id: 1, playerId: 2, colour: "#000000", size: "fine", points: [], done: false } },
      1_000,
    );
    expect(RoomStateUtils.round(state)?.strokes).toBe(strokes);
    expect(strokes).toEqual([]);
  });

  it("confirms your own vote and tracks who has voted", () => {
    const started = play([joined, { type: "roundStarted", round }]);
    const pending = RoomStateUtils.withPendingVote(started, 2);
    const state = play(
      [
        { type: "voteCast", voterId: 2 },
        { type: "voteCast", voterId: 1 },
        { type: "voteCast", voterId: 1 },
      ],
      pending,
    );
    const view = RoomStateUtils.round(state);
    expect(view?.voted).toEqual([2, 1]);
    expect(view?.yourVote).toBe(2);
    expect(state.pendingVote).toBeNull();
  });

  it("moves through the reveal to the result and updates scores", () => {
    const state = play(
      [
        joined,
        { type: "roundStarted", round },
        { type: "votingStarted", durationMs: 30_000 },
        {
          type: "revealed",
          reveal: { bamboozlerId: 2, votes: [{ voterId: 1, suspectId: 2 }], guessRemainingMs: 20_000 },
        },
      ],
      undefined,
      3_000,
    );
    expect(state.room?.phase.phase).toBe("guessing");
    expect(state.timers).toEqual({ turn: null, voting: null, guess: { endsAt: 23_000, totalMs: 20_000 } });

    const finished = RoomStateUtils.apply(
      state,
      {
        type: "roundFinished",
        result: {
          number: 1,
          rounds: 5,
          gameOver: false,
          category: "Animals",
          word: "giraffe",
          bamboozlerId: 2,
          guess: "horse",
          guessCorrect: false,
          votes: [{ voterId: 1, suspectId: 2 }],
          awards: [{ playerId: 1, reason: "caughtTheBamboozler", points: 1 }],
          scores: [
            { id: 1, name: "Sam", score: 1, connected: true, avatar: [], ready: true },
            { id: 2, name: "Noor", score: 0, connected: true, avatar: [], ready: true },
          ],
        },
      },
      4_000,
    );
    expect(finished.room?.phase.phase).toBe("finished");
    expect(finished.room?.players.find((player) => player.id === 1)?.score).toBe(1);
    expect(finished.timers.guess).toBeNull();
  });

  it("keeps the finished drawing for the results, also for a device that joins then", () => {
    const stroke = { id: 1, playerId: 2, colour: "#f13866", size: "medium" as const, points: [], done: true };
    const playing = play([
      joined,
      { type: "roundStarted", round },
      { type: "strokeBegun", stroke },
      { type: "votingStarted", durationMs: 30_000 },
      { type: "revealed", reveal: { bamboozlerId: 2, votes: [], guessRemainingMs: 20_000 } },
    ]);
    const result = {
      number: 1,
      rounds: 5,
      gameOver: false,
      category: "Animals",
      word: "giraffe",
      bamboozlerId: 2,
      guess: null,
      guessCorrect: false,
      votes: [],
      awards: [],
      scores: [],
    };
    const finished = RoomStateUtils.apply(playing, { type: "roundFinished", result }, 1_000);
    expect(finished.room?.phase).toEqual({ phase: "finished", result, strokes: [stroke] });

    const late = RoomStateUtils.apply(
      RoomStateUtils.initial(),
      {
        type: "joined",
        serverVersion: "dev",
        you: 3,
        sessionToken: "t",
        room: { ...lobby, phase: { phase: "finished", result, strokes: [stroke] } },
      },
      1_000,
    );
    expect(late.room?.phase.phase === "finished" && late.room.phase.strokes).toEqual([stroke]);
  });

  it("remembers the last rejection", () => {
    const state = RoomStateUtils.apply(play([joined]), { type: "rejected", reason: "notHost" }, 7_000);
    expect(state.rejection).toEqual({ reason: "notHost", at: 7_000 });
  });

  it("only changes status when it actually changes", () => {
    const state = RoomStateUtils.initial();
    expect(RoomStateUtils.withStatus(state, "connecting")).toBe(state);
    expect(RoomStateUtils.withStatus(state, "failed", "roomNotFound")).toMatchObject({
      status: "failed",
      failure: "roomNotFound",
    });
  });
});
