import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import type { BrushSize } from "@/protocol/generated/BrushSize";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { StrokeView } from "@/protocol/generated/StrokeView";

/** Same as the server (`limits.rs`), which drops whatever goes past them without a word. */
const limits = { pointsPerMessage: 128, pointsPerStroke: 2_048, strokesPerTimedTurn: 40 };
/** What the protocol sends for a device without pressure. */
const NO_PRESSURE = 0.5;

const sizes = Object.fromEntries(CanvasTools.brushes.map((brush) => [brush.id, brush.size])) as Record<
  BrushSize,
  number
>;

const brushFor = (size: number) =>
  CanvasTools.brushes.reduce((best, brush) =>
    Math.abs(brush.size - size) < Math.abs(best.size - size) ? brush : best,
  );

function chunks(points: StrokePoint[]): StrokePoint[][] {
  const out: StrokePoint[][] = [];
  for (let i = 0; i < points.length; i += limits.pointsPerMessage)
    out.push(points.slice(i, i + limits.pointsPerMessage));
  return out;
}

/** More points for the stroke being drawn, in messages the server accepts. */
function extend(points: StrokePoint[]): ClientMessage[] {
  return chunks(points).map((batch) => ({ type: "extendStroke", points: batch }));
}

/** A new stroke: its colour, brush and first points, the rest following as `extendStroke`. */
function begin(stroke: Pick<Stroke, "color" | "size" | "points">): ClientMessage[] {
  const [first = [], ...rest] = chunks(stroke.points);
  return [
    { type: "beginStroke", colour: stroke.color, size: brushFor(stroke.size).id, points: first },
    ...rest.map((batch): ClientMessage => ({ type: "extendStroke", points: batch })),
  ];
}

/** A stroke from the server, ready for the canvas. The wire has no pressure flag: a mouse always says 0.5. */
function toStroke(view: StrokeView): Stroke {
  return {
    id: `s${view.id}`,
    playerId: view.playerId,
    color: view.colour,
    size: sizes[view.size],
    hasPressure: view.points.some((point) => point[2] !== NO_PRESSURE),
    points: view.points,
  };
}

/** Points as they go over the wire: without a pen, the pressure the device reported (touch screens do) becomes 0.5. */
function forWire(points: StrokePoint[], hasPressure: boolean): StrokePoint[] {
  return hasPressure ? points : points.map(([x, y]) => [x, y, NO_PRESSURE]);
}

export const StrokeWireUtils = { limits, begin, extend, forWire, toStroke };
