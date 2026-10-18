import { describe, expect, it } from "vitest";
import type { RoomSetup } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

const players = ["pip", "juno", "mo"];
const TURN = 10_000;

const drawing = (mode: "classic" | "timed" = "timed", laps = 2) =>
  RoundUtils.start(
    RoundUtils.create({ mode, turnMs: TURN, totalTurns: laps * players.length, bamboozlerId: "mo" }),
    1_000,
  );

const voting = () => RoundUtils.tick(drawing("timed", 1), 1_000 + 3 * TURN);

describe("RoundUtils: drawing", () => {
  it("starts with the first player in the turn order", () => {
    const round = drawing();
    expect(round.phase).toBe("drawing");
    expect(RoundUtils.activeIndex(round, 3)).toBe(0);
    expect(RoundUtils.lap(round, 3)).toBe(1);
  });

  it("ends a one-stroke turn after one stroke, a timed turn only when its time is up", () => {
    expect(RoundUtils.strokeFinished(drawing("classic"), 0, 2_000).turnCount).toBe(1);
    const timed = drawing("timed");
    expect(RoundUtils.strokeFinished(timed, 0, 2_000)).toBe(timed);
    expect(RoundUtils.tick(timed, 1_000 + TURN).turnCount).toBe(1);
  });

  it("doesn't skip the next player when a stroke ends just after the turn timed out", () => {
    const timedOut = RoundUtils.tick(drawing("classic"), 1_000 + TURN);
    expect(RoundUtils.strokeFinished(timedOut, 0, 11_001)).toBe(timedOut);
  });

  it("counts laps", () => {
    let round = drawing("classic", 3);
    for (let turn = 0; turn < 4; turn++) round = RoundUtils.endTurn(round, turn, 2_000 + turn);
    expect(RoundUtils.lap(round, 3)).toBe(2);
    expect(RoundUtils.activeIndex(round, 3)).toBe(1);
  });

  it("moves to the final vote after the last turn of the last lap", () => {
    let round = drawing("classic", 1);
    for (let turn = 0; turn < 3; turn++) round = RoundUtils.endTurn(round, turn, 5_000);
    expect(round.phase).toBe("voting");
    expect(round.phaseStartedAt).toBe(5_000);
  });

  it("starts the vote when the last turn ran out, even when the clock catches up late", () => {
    const round = RoundUtils.tick(drawing("timed", 1), 1_000 + 3 * TURN + 2_500);
    expect(round.phase).toBe("voting");
    expect(round.phaseStartedAt).toBe(1_000 + 3 * TURN);
  });

  it("returns the same round when nothing changed, so React can skip a render", () => {
    const round = drawing();
    expect(RoundUtils.tick(round, 1_500)).toBe(round);
  });
});

describe("RoundUtils: suspicions and votes", () => {
  it("lets players change who they suspect while drawing", () => {
    let round = RoundUtils.suspect(drawing(), "pip", "mo");
    round = RoundUtils.suspect(round, "pip", "juno");
    expect(round.suspicions).toEqual({ pip: "juno" });
    expect(RoundUtils.suspect(round, "pip", null).suspicions).toEqual({});
  });

  it("ignores suspecting yourself, the same suspect twice, or suspecting outside the drawing", () => {
    const round = RoundUtils.suspect(drawing(), "pip", "mo");
    expect(RoundUtils.suspect(round, "pip", "pip")).toBe(round);
    expect(RoundUtils.suspect(round, "pip", "mo")).toBe(round);
    expect(RoundUtils.suspect(voting(), "pip", "mo").suspicions).toEqual({});
  });

  it("counts how many suspect each player, while drawing only", () => {
    let round = RoundUtils.suspect(drawing(), "pip", "mo");
    round = RoundUtils.suspect(round, "juno", "mo");
    expect(RoundUtils.suspectedBy(round)).toEqual({ mo: 2 });
    expect(RoundUtils.suspectedBy(voting())).toEqual({});
  });

  it("locks a vote once and only during the vote", () => {
    const round = RoundUtils.castVote(voting(), "pip", "mo", players, 32_000);
    expect(round.votes).toEqual({ pip: "mo" });
    expect(RoundUtils.castVote(round, "pip", "juno", players, 33_000)).toBe(round);
    const notYet = drawing();
    expect(RoundUtils.castVote(notYet, "pip", "mo", players, 2_000)).toBe(notYet);
  });

  it("reveals as soon as everyone has voted", () => {
    let round = voting();
    round = RoundUtils.castVote(round, "pip", "mo", players, 32_000);
    round = RoundUtils.castVote(round, "juno", "mo", players, 33_000);
    round = RoundUtils.castVote(round, "mo", "pip", players, 34_000);
    expect(round.phase).toBe("reveal");
    expect(round.phaseStartedAt).toBe(34_000);
  });

  it("counts your last suspicion when you don't vote in time", () => {
    let round = RoundUtils.suspect(drawing("timed", 1), "juno", "mo");
    round = RoundUtils.tick(round, 1_000 + 3 * TURN);
    round = RoundUtils.castVote(round, "pip", "juno", players, 32_000);
    round = RoundUtils.tick(round, round.phaseStartedAt + RoundUtils.VOTE_MS);
    expect(round.phase).toBe("reveal");
    expect(round.votes).toEqual({ pip: "juno", juno: "mo" });
  });
});

describe("RoundUtils: reveal, guess, results", () => {
  const revealed = () => RoundUtils.tick(voting(), voting().phaseStartedAt + RoundUtils.VOTE_MS);
  const guessing = () => RoundUtils.tick(revealed(), revealed().phaseStartedAt + RoundUtils.REVEAL_MS);

  it("moves from the reveal to the bamboozler's guess", () => {
    expect(guessing().phase).toBe("guess");
  });

  it("accepts a guess regardless of case, accents and punctuation", () => {
    expect(RoundUtils.guessWord(guessing(), " Gi-RAFFE ", "Giraffe", 50_000).guess).toEqual({
      text: "Gi-RAFFE",
      right: true,
    });
    expect(RoundUtils.guessWord(guessing(), "crème", "Creme", 50_000).guess?.right).toBe(true);
    expect(RoundUtils.guessWord(guessing(), "Paard", "Giraffe", 50_000).guess?.right).toBe(false);
    expect(RoundUtils.guessWord(guessing(), "", "Giraffe", 50_000).guess?.right).toBe(false);
  });

  it("forgives one typo in longer words, not in short ones", () => {
    expect(RoundUtils.guessWord(guessing(), "girafe", "Giraffe", 50_000).guess?.right).toBe(true);
    expect(RoundUtils.guessWord(guessing(), "girrafe", "Giraffe", 50_000).guess?.right).toBe(false);
    expect(RoundUtils.guessWord(guessing(), "cap", "Cat", 50_000).guess?.right).toBe(false);
  });

  it("catches up in one go after the page was hidden through the vote", () => {
    const round = RoundUtils.suspect(drawing("timed", 1), "juno", "mo");
    const later = RoundUtils.tick(round, 1_000 + 3 * TURN + RoundUtils.VOTE_MS + RoundUtils.REVEAL_MS + 1);
    expect(later.phase).toBe("guess");
    expect(later.votes).toEqual({ juno: "mo" });
  });

  it("goes to the results without a guess when the bamboozler runs out of time", () => {
    const round = RoundUtils.tick(guessing(), guessing().phaseStartedAt + RoundUtils.GUESS_MS);
    expect(round.phase).toBe("results");
    expect(round.guess).toBeNull();
  });
});

describe("RoundUtils: setup and clocks", () => {
  const setup: RoomSetup = {
    mode: "classic",
    laps: 3,
    turnSeconds: 20,
    rounds: 5,
    attribution: "free",
    language: "en",
    adults: false,
  };

  it("uses the chosen laps for one stroke each, and two laps of the chosen length for timed turns", () => {
    expect(RoundUtils.lapsFor(setup)).toBe(3);
    expect(RoundUtils.lapsFor({ ...setup, mode: "timed" })).toBe(2);
    expect(RoundUtils.turnMsFor({ ...setup, mode: "timed" })).toBe(20_000);
    expect(RoundUtils.turnMsFor(setup)).toBe(15_000);
  });

  it("estimates a round's length in minutes", () => {
    expect(RoundUtils.estimateRoundMinutes({ ...setup, mode: "timed", turnSeconds: 20 }, 4)).toBe(3);
    expect(RoundUtils.estimateRoundMinutes(setup, 3)).toBe(2);
  });

  it("reports what's left of the turn and of the vote", () => {
    expect(RoundUtils.turnLeft(drawing(), 3_000)).toBe(TURN - 2_000);
    expect(RoundUtils.phaseLeft(voting(), voting().phaseStartedAt + 10_000)).toBe(20_000);
    expect(RoundUtils.phaseLeft(drawing(), 3_000)).toBe(0);
  });

  it("formats a countdown, rounding up", () => {
    expect(RoundUtils.formatClock(60_000)).toBe("1:00");
    expect(RoundUtils.formatClock(29_200)).toBe("0:30");
    expect(RoundUtils.formatClock(0)).toBe("0:00");
  });
});
