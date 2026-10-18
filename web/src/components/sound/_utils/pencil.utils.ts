import type { StrokePoint } from "@/components/canvas/_types/stroke.types";

/** Points `from` onwards, as canvas widths per second since the point before them; 0 when there's nothing new. */
function speed(points: readonly StrokePoint[], from: number, seconds: number): number {
  let distance = 0;
  for (let i = Math.max(1, from); i < points.length; i++) {
    const [x0, y0] = points[i - 1] ?? points[i]!;
    const [x1, y1] = points[i]!;
    distance += Math.hypot(x1 - x0, y1 - y0);
  }
  return distance / Math.max(seconds, 1 / 60);
}

export const PencilUtils = { speed };
