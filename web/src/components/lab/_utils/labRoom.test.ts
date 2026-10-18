import { describe, expect, it } from "vitest";
import { LabRoomUtils, type LabSnapshot } from "@/components/lab/_utils/labRoom.utils";
import { RoundUtils } from "@/components/lab/_utils/round.utils";
import { playersFixture } from "@/components/room/_fixtures/players.fixture";
import { RoomStateUtils } from "@/protocol/roomState.utils";

const [pip, juno, mo] = [1, 2, 3];

const snapshot = (patch: Partial<LabSnapshot> = {}): LabSnapshot => ({
  code: "BKZW",
  players: playersFixture.slice(0, 3),
  youId: juno,
  setup: { ...RoundUtils.DEFAULT_SETUP, turnsPerPlayer: 1, rounds: 2, categories: ["Animals"] },
  wordCategories: [],
  round: RoundUtils.create({ mode: "oneStroke", turnMs: 15_000, totalTurns: 3, bamboozlerId: mo }),
  roundNumber: 1,
  totals: {},
  word: { category: "Animals", word: "Giraffe" },
  strokes: [],
  now: 1_000,
  ...patch,
});

const drawing = () => RoundUtils.start(snapshot().round, 1_000);

describe("LabRoomUtils.toState", () => {
  it("waits in the lobby before the first round, with you as the host", () => {
    const state = LabRoomUtils.toState(snapshot(), "player");
    expect(state.room.phase).toEqual({ phase: "lobby" });
    expect(state.you).toBe(juno);
    expect(state.room.hostId).toBe(juno);
  });

  it("shows the word to artists only, and never to the host screen", () => {
    const round = drawing();
    const yours = RoomStateUtils.round(LabRoomUtils.toState(snapshot({ round }), "player"));
    expect(yours).toMatchObject({ word: "Giraffe", role: "artist", activePlayerId: pip, turn: 1 });

    const host = LabRoomUtils.toState(snapshot({ round }), "host");
    expect(host.you).toBeNull();
    expect(RoomStateUtils.round(host)).toMatchObject({ word: null, role: null });

    const bamboozled = RoomStateUtils.round(LabRoomUtils.toState(snapshot({ round, youId: mo }), "player"));
    expect(bamboozled).toMatchObject({ word: null, role: "bamboozler" });
  });

  it("turns the turn and the vote into countdowns", () => {
    const state = LabRoomUtils.toState(snapshot({ round: drawing() }), "player");
    expect(state.timers.turn).toEqual({ endsAt: 16_000, totalMs: 15_000 });
  });

  it("reveals the bamboozler and the votes for the guess", () => {
    let round = RoundUtils.endTurn(RoundUtils.endTurn(RoundUtils.endTurn(drawing(), 0, 2_000), 1, 3_000), 2, 4_000);
    round = RoundUtils.castVote(round, pip, mo, [pip, juno, mo], 5_000);
    round = RoundUtils.tick(round, 4_000 + RoundUtils.VOTE_MS);
    const { phase } = LabRoomUtils.toState(snapshot({ round, now: 40_000 }), "player").room;
    expect(phase).toMatchObject({
      phase: "guessing",
      reveal: { bamboozlerId: mo, votes: [{ voterId: pip, suspectId: mo }] },
    });
  });

  it("finishes with the awards and the new totals, and says when the game is over", () => {
    const round = { ...drawing(), phase: "results" as const, votes: { [pip]: mo, [juno]: pip }, guess: null };
    const state = LabRoomUtils.toState(snapshot({ round, roundNumber: 2, totals: { [pip]: 1 } }), "player");
    expect(state.room.phase).toMatchObject({
      phase: "finished",
      result: {
        gameOver: true,
        word: "Giraffe",
        awards: [{ playerId: pip, reason: "caughtTheBamboozler", points: 1 }],
      },
    });
    expect(state.room.players.find((player) => player.id === pip)?.score).toBe(2);
  });
});
