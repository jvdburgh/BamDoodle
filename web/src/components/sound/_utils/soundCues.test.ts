import { describe, expect, it } from "vitest";
import { SoundCuesUtils, type SoundMoment } from "@/components/sound/_utils/soundCues.utils";

const moment = (patch: Partial<SoundMoment> = {}): SoundMoment => ({
  phase: "drawing",
  turnCount: 0,
  yourTurn: false,
  turnSeconds: 10,
  voteSeconds: 0,
  ...patch,
});

const { between } = SoundCuesUtils;

describe("SoundCuesUtils.between", () => {
  it("plays a jingle when drawing starts, also in later rounds", () => {
    expect(between(moment({ phase: "lobby" }), moment())).toEqual(["start"]);
    expect(between(moment({ phase: "finished" }), moment())).toEqual(["start"]);
  });

  it("sounds time's up when the final vote opens, and a reveal after it", () => {
    expect(between(moment(), moment({ phase: "voting", voteSeconds: 30 }))).toEqual(["timeUp"]);
    expect(between(moment({ phase: "voting" }), moment({ phase: "guessing" }))).toEqual(["reveal"]);
  });

  it("stays quiet when nothing changed", () => {
    expect(between(moment(), moment())).toEqual([]);
    expect(between(moment({ phase: "finished" }), moment({ phase: "finished" }))).toEqual([]);
  });

  it("blips on a new turn, brighter when it's yours", () => {
    expect(between(moment(), moment({ turnCount: 1 }))).toEqual(["turn"]);
    expect(between(moment(), moment({ turnCount: 1, yourTurn: true }))).toEqual(["yourTurn"]);
  });

  it("ticks every second in the last three seconds of a turn", () => {
    expect(between(moment({ turnSeconds: 5 }), moment({ turnSeconds: 4 }))).toEqual([]);
    expect(between(moment({ turnSeconds: 4 }), moment({ turnSeconds: 3 }))).toEqual(["tick"]);
    expect(between(moment({ turnSeconds: 1 }), moment({ turnSeconds: 0 }))).toEqual(["tick"]);
  });

  it("doesn't tick when a new turn resets the clock", () => {
    expect(between(moment({ turnSeconds: 1 }), moment({ turnCount: 1, turnSeconds: 10 }))).toEqual(["turn"]);
  });

  it("ticks the vote's last five seconds", () => {
    const voting = (voteSeconds: number) => moment({ phase: "voting", voteSeconds });
    expect(between(voting(7), voting(6))).toEqual([]);
    expect(between(voting(6), voting(5))).toEqual(["voteTick"]);
  });
});
