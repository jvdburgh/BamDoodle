import { describe, expect, it } from "vitest";
import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

const box = { left: 100, top: 50, width: 400, height: 300 };

describe("CanvasUtils.normalise", () => {
  it("maps client coordinates to 0..1 of the canvas box", () => {
    expect(CanvasUtils.normalise(300, 200, 0.8, box)).toEqual([0.5, 0.5, 0.8]);
  });

  it("clamps points dragged outside the canvas", () => {
    expect(CanvasUtils.normalise(0, 1000, 0.5, box)).toEqual([0, 1, 0.5]);
  });

  it("rounds to four decimals for the wire", () => {
    const [x, y] = CanvasUtils.normalise(100 + 400 / 3, 50 + 300 / 7, 0.5, box);
    expect(x).toBe(0.3333);
    expect(y).toBe(0.1429);
  });

  it("treats a pressure of 0 as the default mouse pressure", () => {
    expect(CanvasUtils.normalise(100, 50, 0, box)[2]).toBe(0.5);
  });
});

describe("CanvasUtils.simplify", () => {
  const line = (count: number, step: number): StrokePoint[] =>
    Array.from({ length: count }, (_, i) => [i * step, 0, 0.5] as StrokePoint);

  it("drops points closer than the tolerance", () => {
    expect(CanvasUtils.simplify(line(11, 0.001), 0.005)).toEqual([
      [0, 0, 0.5],
      [0.005, 0, 0.5],
      [0.01, 0, 0.5],
    ]);
  });

  it("keeps the first and last point", () => {
    const points = line(5, 0.0001);
    const simplified = CanvasUtils.simplify(points, 1);
    expect(simplified).toEqual([points[0], points[4]]);
  });

  it("leaves short strokes alone", () => {
    const dot: StrokePoint[] = [[0.5, 0.5, 0.5]];
    expect(CanvasUtils.simplify(dot, 1)).toBe(dot);
  });
});

describe("CanvasUtils.strokeToPath", () => {
  const stroke: Stroke = {
    id: "s1",
    playerId: 1,
    color: "#000000",
    size: 0.01,
    hasPressure: false,
    points: [
      [0.1, 0.1, 0.5],
      [0.5, 0.3, 0.5],
      [0.9, 0.2, 0.5],
    ],
  };

  it("returns a closed SVG path", () => {
    const path = CanvasUtils.strokeToPath(stroke, 800, 600);
    expect(path).toMatch(/^M[\d.]+,[\d.]+ Q/);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("scales to the pixel space it is drawn in", () => {
    const small = CanvasUtils.strokeToPath(stroke, 80, 60);
    const firstX = (path: string) => Number(path.slice(1, path.indexOf(",")));
    expect(firstX(CanvasUtils.strokeToPath(stroke, 800, 600))).toBeCloseTo(firstX(small) * 10, 0);
  });

  it("draws a single tap as a dot", () => {
    expect(CanvasUtils.strokeToPath({ ...stroke, points: [[0.5, 0.5, 0.5]] }, 800, 600)).not.toBe("");
  });
});
