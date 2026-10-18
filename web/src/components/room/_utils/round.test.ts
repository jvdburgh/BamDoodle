import { describe, expect, it } from "vitest";
import { RoundUtils } from "@/components/room/_utils/round.utils";

const started = (mode: "classic" | "timed") => RoundUtils.start(RoundUtils.create(mode), 1_000);

describe("RoundUtils", () => {
  it("starts with the first player in the turn order", () => {
    const round = started("classic");
    expect(round.phase).toBe("drawing");
    expect(RoundUtils.activeIndex(round, 4)).toBe(0);
  });

  it("ends a classic turn after one stroke", () => {
    const round = RoundUtils.strokeFinished(started("classic"), 0, 3_000);
    expect(RoundUtils.activeIndex(round, 4)).toBe(1);
    expect(round.turnStartedAt).toBe(3_000);
  });

  it("keeps a timed turn going after a stroke", () => {
    const round = started("timed");
    expect(RoundUtils.strokeFinished(round, 0, 3_000)).toBe(round);
  });

  it("doesn't skip the next player when a stroke ends just after the turn timed out", () => {
    const timedOut = RoundUtils.tick(started("classic"), 1_000 + RoundUtils.turnLength("classic"));
    expect(timedOut.turnCount).toBe(1);
    expect(RoundUtils.strokeFinished(timedOut, 0, 9_001)).toBe(timedOut);
    expect(RoundUtils.endTurn(timedOut, 0, 9_001)).toBe(timedOut);
  });

  it("passes the turn when its time runs out", () => {
    const round = RoundUtils.tick(started("timed"), 1_000 + RoundUtils.turnLength("timed"));
    expect(RoundUtils.activeIndex(round, 4)).toBe(1);
  });

  it("catches up on several expired turns at once", () => {
    const length = RoundUtils.turnLength("classic");
    const round = RoundUtils.tick(started("classic"), 1_000 + length * 2 + 10);
    expect(round.turnCount).toBe(2);
    expect(round.turnStartedAt).toBe(1_000 + length * 2);
  });

  it("wraps around the turn order", () => {
    let round = started("classic");
    for (let i = 0; i < 5; i++) round = RoundUtils.endTurn(round, i, 2_000 + i);
    expect(RoundUtils.activeIndex(round, 4)).toBe(1);
  });

  it("returns the same round when nothing changed, so React can skip a render", () => {
    const round = started("classic");
    expect(RoundUtils.tick(round, 1_500)).toBe(round);
  });

  it("ends the round when the round timer runs out", () => {
    const round = RoundUtils.tick(started("timed"), 1_000 + RoundUtils.ROUND_MS);
    expect(round.phase).toBe("over");
    expect(RoundUtils.roundLeft(round, 1_000 + RoundUtils.ROUND_MS)).toBe(0);
    expect(RoundUtils.endTurn(round, round.turnCount, 99_000)).toBe(round);
  });

  it("reports the time left in the turn and the round", () => {
    const round = started("classic");
    expect(RoundUtils.turnLeft(round, 3_000)).toBe(RoundUtils.turnLength("classic") - 2_000);
    expect(RoundUtils.roundLeft(round, 3_000)).toBe(RoundUtils.ROUND_MS - 2_000);
  });

  it("only changes the mode between rounds", () => {
    const round = started("classic");
    expect(RoundUtils.setMode(round, "timed")).toBe(round);
    expect(RoundUtils.setMode(RoundUtils.create("classic"), "timed").mode).toBe("timed");
  });

  it("formats a countdown, rounding up", () => {
    expect(RoundUtils.formatClock(60_000)).toBe("1:00");
    expect(RoundUtils.formatClock(41_200)).toBe("0:42");
    expect(RoundUtils.formatClock(0)).toBe("0:00");
  });
});
