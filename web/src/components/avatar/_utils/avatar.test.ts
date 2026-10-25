import { describe, expect, it } from "vitest";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";

describe("AvatarUtils.doodle", () => {
  it("draws the same face for the same seed", () => {
    expect(AvatarUtils.doodle(4)).toEqual(AvatarUtils.doodle(4));
  });

  it("draws different faces for different seeds", () => {
    expect(AvatarUtils.doodle(4)).not.toEqual(AvatarUtils.doodle(5));
  });

  it("draws a head, two eyes and a mouth at least", () => {
    expect(AvatarUtils.doodle(1).length).toBeGreaterThanOrEqual(4);
  });

  it("stays inside its 100 × 100 box", () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const stroke of AvatarUtils.doodle(seed)) {
        for (const [x, y] of stroke) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(100);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});

describe("AvatarUtils.face", () => {
  it("turns the doodle into white strokes normalised to 0..1", () => {
    const face = AvatarUtils.face(4);
    expect(face).toHaveLength(AvatarUtils.doodle(4).length);
    for (const stroke of face) {
      expect(stroke).toMatchObject({ color: "#ffffff", size: AvatarUtils.brushSize, hasPressure: false });
      for (const [x, y, pressure] of stroke.points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
        expect(pressure).toBe(0.5);
      }
    }
  });

  it("keeps the doodle's shape, with fewer points", () => {
    const doodle = AvatarUtils.doodle(4);
    AvatarUtils.face(4).forEach(({ points }, index) => {
      const original = doodle[index] ?? [];
      expect(points.length).toBeLessThanOrEqual(original.length);
      for (const [from, to] of [
        [points[0], original[0]],
        [points.at(-1), original.at(-1)],
      ]) {
        expect(from?.[0]).toBeCloseTo((to?.[0] ?? 0) / 100, 3);
        expect(from?.[1]).toBeCloseTo((to?.[1] ?? 0) / 100, 3);
      }
    });
  });

  it("leaves room to draw within the limits", () => {
    for (let seed = 0; seed < 200; seed++) {
      const points = AvatarUtils.face(seed).reduce((count, stroke) => count + stroke.points.length, 0);
      expect(points).toBeLessThan(AvatarUtils.limits.points / 2);
    }
  });
});

describe("AvatarUtils.edit", () => {
  const face = AvatarUtils.face(1);
  const line: AvatarStroke = { color: "#f13866", size: 0.04, hasPressure: false, points: [[0.2, 0.2, 0.5]] };

  it("adds a drawn stroke on top", () => {
    expect(AvatarUtils.edit(face, { kind: "draw", stroke: line })).toEqual([...face, line]);
  });

  it("clears, and randomizes to a doodle face", () => {
    expect(AvatarUtils.edit(face, { kind: "clear" })).toEqual([]);
    expect(AvatarUtils.edit([], { kind: "randomize", seed: 9 })).toEqual(AvatarUtils.face(9));
  });

  it("refuses a stroke past the limits", () => {
    const points = Array.from({ length: AvatarUtils.limits.points }, (): StrokePoint => [0.5, 0.5, 0.5]);
    expect(AvatarUtils.edit(face, { kind: "draw", stroke: { ...line, points } })).toBe(face);
    const many = Array.from({ length: AvatarUtils.limits.strokes }, () => line);
    expect(AvatarUtils.edit(many, { kind: "draw", stroke: line })).toBe(many);
  });

  it("does nothing when there is nothing to clear", () => {
    const empty: AvatarStroke[] = [];
    expect(AvatarUtils.edit(empty, { kind: "clear" })).toBe(empty);
  });
});

describe("AvatarUtils.toWire and fromWire", () => {
  const drawn: AvatarStroke[] = [
    { color: "#fbb03b", size: AvatarUtils.brushSize, hasPressure: true, points: [[0.123_456, 0.5, 0.987_6]] },
    { color: AvatarUtils.white, size: AvatarUtils.brushSize, hasPressure: false, points: [[0.25, 0.75, 0.5]] },
  ];

  it("sends colour, pressure and points at 3 decimals, without the size", () => {
    expect(AvatarUtils.toWire(drawn)).toEqual([
      { colour: "#fbb03b", pressure: true, points: [[0.123, 0.5, 0.988]] },
      { colour: "#ffffff", pressure: false, points: [[0.25, 0.75, 0.5]] },
    ]);
  });

  it("brings an avatar from the server back in the one avatar pen", () => {
    const back = AvatarUtils.fromWire(AvatarUtils.toWire(drawn));
    expect(back.map((stroke) => stroke.size)).toEqual([AvatarUtils.brushSize, AvatarUtils.brushSize]);
    expect(back[1]).toEqual(drawn[1]);
    expect(back[0]).toEqual({ ...drawn[0], points: [[0.123, 0.5, 0.988]] });
  });

  it("keeps every doodle face inside the server's limits", () => {
    for (let seed = 0; seed < 50; seed++) {
      const wire = AvatarUtils.toWire(AvatarUtils.face(seed));
      const points = wire.reduce((count, stroke) => count + stroke.points.length, 0);
      expect(wire.length).toBeLessThanOrEqual(AvatarUtils.limits.strokes);
      expect(points).toBeLessThanOrEqual(AvatarUtils.limits.points);
      expect(wire.every((stroke) => stroke.points.length > 0)).toBe(true);
    }
  });
});
