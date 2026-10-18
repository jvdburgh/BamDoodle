import { describe, expect, it } from "vitest";
import { SoundCuesUtils, type SoundMoment } from "@/components/sound/_utils/soundCues.utils";

const moment = (patch: Partial<SoundMoment> = {}): SoundMoment => ({
  phase: "drawing",
  turnCount: 0,
  yourTurn: false,
  turnSeconds: 10,
  roundSeconds: 50,
  ...patch,
});

const { between } = SoundCuesUtils;

describe("SoundCuesUtils.between", () => {
  it("plays the start jingle when the round starts", () => {
    expect(between(moment({ phase: "waiting" }), moment())).toEqual(["start"]);
  });

  it("chimes when time's up", () => {
    expect(between(moment(), moment({ phase: "over" }))).toEqual(["timeUp"]);
  });

  it("stays quiet when nothing changed", () => {
    expect(between(moment(), moment())).toEqual([]);
    expect(between(moment({ phase: "over" }), moment({ phase: "over" }))).toEqual([]);
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

  it("ticks the round's last five seconds instead of the turn's", () => {
    expect(between(moment({ roundSeconds: 6, turnSeconds: 3 }), moment({ roundSeconds: 5, turnSeconds: 2 }))).toEqual([
      "roundTick",
    ]);
  });

  it("never ticks the turn in the round's last seconds, even out of step", () => {
    expect(between(moment({ roundSeconds: 4, turnSeconds: 3 }), moment({ roundSeconds: 4, turnSeconds: 2 }))).toEqual(
      [],
    );
  });
});
