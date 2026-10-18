import { describe, expect, it } from "vitest";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { StrokeWireUtils } from "@/components/room/_utils/strokeWire.utils";

const line = (count: number): StrokePoint[] =>
  Array.from({ length: count }, (_, i) => [Math.round((i / count) * 10_000) / 10_000, 0.5, 0.5]);

describe("StrokeWireUtils.messages", () => {
  it("starts a stroke with its colour, size and first points", () => {
    const messages = StrokeWireUtils.begin({ color: "#f13866", size: 0.014, points: line(3) });
    expect(messages).toEqual([{ type: "beginStroke", colour: "#f13866", size: "medium", points: line(3) }]);
  });

  it("never sends more than 128 points in one message", () => {
    const messages = StrokeWireUtils.begin({ color: "#000000", size: 0.03, points: line(300) });
    expect(messages.map((message) => message.type)).toEqual(["beginStroke", "extendStroke", "extendStroke"]);
    const counts = messages.map((message) => ("points" in message ? message.points.length : 0));
    expect(counts).toEqual([128, 128, 44]);
    expect(StrokeWireUtils.extend(line(129)).map((message) => message.type)).toEqual(["extendStroke", "extendStroke"]);
  });

  it("sends nothing for no points", () => {
    expect(StrokeWireUtils.extend([])).toEqual([]);
  });
});

describe("StrokeWireUtils.forWire", () => {
  it("sends 0.5 for touch and mouse, real pressure only for a pen", () => {
    const touch: StrokePoint[] = [[0.1, 0.2, 0.73]];
    expect(StrokeWireUtils.forWire(touch, false)).toEqual([[0.1, 0.2, 0.5]]);
    expect(StrokeWireUtils.forWire(touch, true)).toBe(touch);
  });
});

describe("StrokeWireUtils.toStroke", () => {
  it("draws a stroke from the wire with the brush it names", () => {
    const stroke = StrokeWireUtils.toStroke({
      id: 7,
      playerId: 2,
      colour: "#2da8c3",
      size: "bold",
      points: [[0.1, 0.2, 0.5]],
      done: true,
    });
    expect(stroke).toEqual({
      id: "s7",
      playerId: 2,
      color: "#2da8c3",
      size: 0.03,
      hasPressure: false,
      points: [[0.1, 0.2, 0.5]],
    });
  });

  it("treats points with real pressure as a pen", () => {
    const stroke = StrokeWireUtils.toStroke({
      id: 1,
      playerId: 1,
      colour: "#000000",
      size: "fine",
      points: [
        [0.1, 0.2, 0.5],
        [0.2, 0.2, 0.8],
      ],
      done: false,
    });
    expect(stroke.hasPressure).toBe(true);
  });
});
