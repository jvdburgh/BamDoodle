import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";

const asPoints = (points: number[][]) => points as StrokePoint[];

const stroke = (id: string, playerId: string, color: string, size: number, points: number[][]): Stroke => ({
  id,
  playerId,
  color,
  size,
  hasPressure: false,
  points: asPoints(points),
});

/** A giraffe-ish drawing by four players, for stories. Coordinates are normalised; y is squashed for 4:3. */
export const giraffeStrokesFixture: Stroke[] = [
  stroke(
    "pip-1",
    "pip",
    "#fbb03b",
    0.014,
    ScribbleUtils.loop(1, { cx: 0.42, cy: 0.62, rx: 0.17, ry: 0.11, turns: 1.05 }),
  ),
  stroke("juno-1", "juno", "#7a4a2a", 0.014, ScribbleUtils.line(2, 0.55, 0.55, 0.66, 0.2, -0.02)),
  stroke("juno-2", "juno", "#7a4a2a", 0.014, ScribbleUtils.line(3, 0.6, 0.6, 0.71, 0.24, -0.02)),
  stroke("mo-1", "mo", "#fbb03b", 0.03, ScribbleUtils.loop(4, { cx: 0.7, cy: 0.18, rx: 0.06, ry: 0.05 })),
  stroke("mo-2", "mo", "#7a4a2a", 0.006, ScribbleUtils.loop(5, { cx: 0.38, cy: 0.6, rx: 0.025, ry: 0.02 })),
  stroke("mo-3", "mo", "#7a4a2a", 0.006, ScribbleUtils.loop(6, { cx: 0.47, cy: 0.66, rx: 0.02, ry: 0.018 })),
  stroke("kiki-1", "kiki", "#000000", 0.014, ScribbleUtils.line(7, 0.32, 0.7, 0.3, 0.9)),
  stroke("kiki-2", "kiki", "#000000", 0.014, ScribbleUtils.line(8, 0.52, 0.7, 0.54, 0.9)),
  stroke("kiki-3", "kiki", "#239447", 0.03, ScribbleUtils.line(9, 0.05, 0.93, 0.95, 0.92, 0.01)),
];
