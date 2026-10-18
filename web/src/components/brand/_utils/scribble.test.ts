import { describe, expect, it } from "vitest";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";

describe("ScribbleUtils", () => {
  it("repeats the same numbers for the same seed", () => {
    const a = ScribbleUtils.random(7);
    const b = ScribbleUtils.random(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(ScribbleUtils.random(8)()).not.toBe(ScribbleUtils.random(7)());
  });

  it("draws a loop around its centre", () => {
    const points = ScribbleUtils.loop(3, { cx: 50, cy: 50, rx: 40, ry: 30 });
    for (const [x, y] of points) {
      expect(Math.abs((x as number) - 50)).toBeLessThan(40 * 1.3);
      expect(Math.abs((y as number) - 50)).toBeLessThan(30 * 1.3);
    }
  });

  it("starts and ends a line where it was asked to", () => {
    const points = ScribbleUtils.line(1, 0, 10, 100, 10, 4);
    expect(points[0]?.slice(0, 2)).toEqual([0, 10]);
    expect(points.at(-1)?.[0]).toBeCloseTo(100);
    expect(points.at(-1)?.[1]).toBeCloseTo(10);
  });
});
