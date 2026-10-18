import { describe, expect, it } from "vitest";
import type { Round } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { ScoreUtils } from "@/components/room/_utils/score.utils";

const players = ["pip", "juno", "mo", "kiki", "rafa"];

const finished = (votes: Record<string, string>, guessed: boolean | null, suspicions = {}): Round => ({
  ...RoundUtils.create({ mode: "classic", turnMs: 15_000, totalTurns: 10, bamboozlerId: "mo" }),
  phase: "results",
  votes,
  suspicions,
  guess: guessed === null ? null : { text: "x", right: guessed },
});

describe("ScoreUtils.forRound", () => {
  it("gives artists who caught the bamboozler a point", () => {
    const scores = ScoreUtils.forRound(finished({ pip: "mo", juno: "kiki", kiki: "mo", rafa: "mo" }, false), players);
    expect(scores.pip).toEqual({ points: 1, right: true });
    expect(scores.juno).toEqual({ points: 0, right: false });
    expect(scores.mo).toEqual({ points: 0, right: false });
  });

  it("gives the bamboozler a point for fooling most artists and one for guessing the word", () => {
    const scores = ScoreUtils.forRound(finished({ pip: "mo", juno: "kiki" }, true), players);
    expect(scores.mo).toEqual({ points: 2, right: true });
  });

  it("counts half the artists as caught, so the bamboozler needs fewer than half", () => {
    const scores = ScoreUtils.forRound(finished({ pip: "mo", juno: "mo", kiki: "pip" }, null), players);
    expect(scores.mo?.points).toBe(0);
  });

  it("counts a suspicion when no vote was locked", () => {
    const scores = ScoreUtils.forRound(finished({}, null, { pip: "mo" }), players);
    expect(scores.pip?.points).toBe(1);
  });
});

describe("ScoreUtils.add and standings", () => {
  it("adds a round to the running totals", () => {
    expect(ScoreUtils.add({ pip: 2 }, { pip: { points: 1, right: true }, mo: { points: 2, right: true } })).toEqual({
      pip: 3,
      mo: 2,
    });
  });

  it("ranks highest first and lets ties share a place", () => {
    expect(ScoreUtils.standings({ pip: 2, juno: 5, mo: 2, kiki: 1 }, ["pip", "juno", "mo", "kiki"])).toEqual([
      { playerId: "juno", total: 5, place: 1 },
      { playerId: "pip", total: 2, place: 2 },
      { playerId: "mo", total: 2, place: 2 },
      { playerId: "kiki", total: 1, place: 4 },
    ]);
  });
});
