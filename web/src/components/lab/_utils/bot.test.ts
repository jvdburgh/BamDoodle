import { describe, expect, it } from "vitest";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { BotUtils } from "@/components/lab/_utils/bot.utils";

const strokes = (seed: number, count: number) => {
  const rand = ScribbleUtils.random(seed);
  return Array.from({ length: count }, () => BotUtils.stroke(rand));
};

describe("BotUtils.stroke", () => {
  it("stays on the sheet", () => {
    for (const stroke of strokes(1, 200)) {
      for (const [x, y] of stroke.points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses palette colours that show up on paper", () => {
    const allowed = new Set(CanvasTools.colours.map((colour) => colour.value));
    for (const stroke of strokes(2, 200)) {
      expect(allowed.has(stroke.color)).toBe(true);
      expect(["#ffffff", "#c9c7d9"]).not.toContain(stroke.color);
    }
  });

  it("sticks to a player's shade family when given one", () => {
    const family = CanvasTools.shadeFamilies[1] ?? [];
    const rand = ScribbleUtils.random(9);
    const values = family.map((colour) => colour.value);
    for (let i = 0; i < 50; i++) expect(values).toContain(BotUtils.stroke(rand, family).color);
  });

  it("uses the fine or medium brush", () => {
    const sizes = CanvasTools.brushes.slice(0, 2).map((brush) => brush.id);
    for (const stroke of strokes(3, 50)) expect(sizes).toContain(stroke.size);
  });

  it("repeats for the same seed", () => {
    expect(strokes(4, 5)).toEqual(strokes(4, 5));
  });

  it("has enough points to be drawn live", () => {
    for (const stroke of strokes(5, 50)) expect(stroke.points.length).toBeGreaterThanOrEqual(7);
  });
});
