import { getStroke, type StrokeOptions } from "perfect-freehand";
import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";

const MOUSE_PRESSURE = 0.5;

const round = (value: number, decimals: number) => Math.round(value * 10 ** decimals) / 10 ** decimals;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type Box = { left: number; top: number; width: number; height: number };

/** Client coordinates to a normalised point, rounded to what goes over the wire. */
function normalise(clientX: number, clientY: number, pressure: number, box: Box): StrokePoint {
  return [
    round(clamp01((clientX - box.left) / box.width), 4),
    round(clamp01((clientY - box.top) / box.height), 4),
    round(pressure > 0 ? pressure : MOUSE_PRESSURE, 2),
  ];
}

/** Drops points closer than `tolerance` to the last kept one; the final point always stays so lines end where the pen lifted. */
function simplify(points: StrokePoint[], tolerance: number): StrokePoint[] {
  if (points.length < 3) return points;
  const first = points[0] as StrokePoint;
  const kept: StrokePoint[] = [first];
  let last = first;
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i] as StrokePoint;
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= tolerance) {
      kept.push(point);
      last = point;
    }
  }
  kept.push(points[points.length - 1] as StrokePoint);
  return kept;
}

/** perfect-freehand outline points to SVG path data, usable by `<path d>` and `new Path2D()`. */
function outlineToPath(outline: number[][]): string {
  const length = outline.length;
  if (length < 4) return "";
  const avg = (a: number, b: number) => ((a + b) / 2).toFixed(2);
  const at = (i: number) => outline[i % length] as [number, number];
  const [a, b, c] = [at(0), at(1), at(2)];
  let path = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0])},${avg(b[1], c[1])} T`;
  for (let i = 2; i < length - 1; i++) {
    const [p, q] = [at(i), at(i + 1)];
    path += `${avg(p[0], q[0])},${avg(p[1], q[1])} `;
  }
  return `${path}Z`;
}

function freehandOptions(size: number, hasPressure: boolean, complete: boolean): StrokeOptions {
  return {
    size,
    thinning: hasPressure ? 0.6 : 0.45,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !hasPressure,
    start: { cap: true, taper: 0 },
    end: { cap: true, taper: 0 },
    last: complete,
  };
}

/** Raw points (any space) to a hand-drawn SVG path; also used for UI scribbles and avatars. */
function freehandPath(points: number[][], size: number, hasPressure = false, complete = true): string {
  return outlineToPath(getStroke(points, freehandOptions(size, hasPressure, complete)));
}

/** A stroke as SVG path data in a `width` × `height` pixel space. */
function strokeToPath(
  stroke: Pick<Stroke, "points" | "size" | "hasPressure">,
  width: number,
  height: number,
  complete = true,
): string {
  const points = stroke.points.map(([x, y, pressure]) => [x * width, y * height, pressure]);
  return freehandPath(points, stroke.size * width, stroke.hasPressure, complete);
}

export const CanvasUtils = { round, normalise, simplify, freehandPath, strokeToPath };
