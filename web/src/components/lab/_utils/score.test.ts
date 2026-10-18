import { describe, expect, it } from "vitest";
import type { Round } from "@/components/lab/_types/lab.types";
import { RoundUtils } from "@/components/lab/_utils/round.utils";
import { ScoreUtils } from "@/components/lab/_utils/score.utils";

const [pip, juno, mo, kiki, rafa] = [1, 2, 3, 4, 5];
const players = [pip, juno, mo, kiki, rafa];

const finished = (votes: Record<number, number>, guessed: boolean | null, suspicions = {}): Round => ({
  ...RoundUtils.create({ mode: "oneStroke", turnMs: 15_000, totalTurns: 10, bamboozlerId: mo }),
  phase: "results",
  votes,
  suspicions,
  guess: guessed === null ? null : { text: "x", right: guessed },
});

const pointsOf = (round: Round) => ScoreUtils.add({}, ScoreUtils.awards(round, players));

describe("ScoreUtils.awards", () => {
  it("gives artists who caught the bamboozler a point", () => {
    const awards = ScoreUtils.awards(finished({ [pip]: mo, [juno]: kiki, [kiki]: mo, [rafa]: mo }, false), players);
    expect(awards).toEqual([
      { playerId: pip, reason: "caughtTheBamboozler", points: 1 },
      { playerId: kiki, reason: "caughtTheBamboozler", points: 1 },
      { playerId: rafa, reason: "caughtTheBamboozler", points: 1 },
    ]);
  });

  it("gives the bamboozler a point for fooling most artists and one for guessing the word", () => {
    expect(pointsOf(finished({ [pip]: mo, [juno]: kiki }, true))[mo]).toBe(2);
  });

  it("counts half the artists as caught, so the bamboozler needs fewer than half", () => {
    expect(pointsOf(finished({ [pip]: mo, [juno]: mo, [kiki]: pip }, null))[mo]).toBeUndefined();
  });

  it("counts a suspicion when no vote was locked", () => {
    expect(pointsOf(finished({}, null, { [pip]: mo }))[pip]).toBe(1);
  });
});

describe("ScoreUtils.add", () => {
  it("adds a round to the running totals", () => {
    const awards = [
      { playerId: pip, reason: "caughtTheBamboozler", points: 1 },
      { playerId: mo, reason: "stayedHidden", points: 1 },
    ] as const;
    expect(ScoreUtils.add({ [pip]: 2 }, [...awards])).toEqual({ [pip]: 3, [mo]: 1 });
  });
});
