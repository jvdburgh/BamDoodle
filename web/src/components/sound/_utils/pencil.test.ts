import { describe, expect, it } from "vitest";
import { PencilUtils } from "@/components/sound/_utils/pencil.utils";

describe("PencilUtils.speed", () => {
  const points: [number, number, number][] = [
    [0, 0, 0.5],
    [0.3, 0, 0.5],
    [0.3, 0.4, 0.5],
  ];

  it("measures only the new points, from the one before them", () => {
    expect(PencilUtils.speed(points, 2, 1)).toBeCloseTo(0.4);
    expect(PencilUtils.speed(points, 1, 1)).toBeCloseTo(0.7);
  });

  it("divides by the time since the last batch", () => {
    expect(PencilUtils.speed(points, 2, 0.5)).toBeCloseTo(0.8);
  });

  it("is 0 without new points and never divides by less than a frame", () => {
    expect(PencilUtils.speed(points, 3, 1)).toBe(0);
    expect(PencilUtils.speed(points, 2, 0)).toBeCloseTo(0.4 * 60);
  });
});
