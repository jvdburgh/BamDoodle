import { describe, expect, it } from "vitest";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";

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
