import { useMemo } from "react";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

export type BrandScribbleShape = "ring" | "underline" | "magnifier" | "speaker" | "speakerOff" | "note" | "noteOff";

const speakerBody = [
  [8, 19, 0.5],
  [15, 19, 0.5],
  [25, 10, 0.5],
  [25, 38, 0.5],
  [15, 29, 0.5],
  [8, 29, 0.5],
  [8, 19, 0.5],
];

type BrandScribbleProps = {
  shape: BrandScribbleShape;
  seed?: number;
  /** Multiplies the line thickness. */
  weight?: number;
  /** Colour comes from `currentColor`, so set it with a `text-*` class. */
  className?: string;
};

const shapes: Record<BrandScribbleShape, { viewBox: string; paths: (seed: number, weight: number) => string[] }> = {
  ring: {
    viewBox: "0 0 100 100",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(ScribbleUtils.loop(seed, { cx: 50, cy: 50, rx: 44, ry: 44 }), 5 * weight),
    ],
  },
  underline: {
    viewBox: "0 0 200 24",
    paths: (seed, weight) => [CanvasUtils.freehandPath(ScribbleUtils.line(seed, 6, 15, 194, 11, -5), 6 * weight)],
  },
  speaker: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(speakerBody, 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed, 31, 17, 31, 31, -4), 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 36, 12, 36, 36, -7), 3.5 * weight),
    ],
  },
  speakerOff: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(speakerBody, 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed, 31, 18, 41, 30), 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 41, 18, 31, 30), 3.5 * weight),
    ],
  },
  note: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(ScribbleUtils.loop(seed, { cx: 17, cy: 35, rx: 6, ry: 5, turns: 1.1 }), 4 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 23, 35, 23, 9, 0.5), 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 2, 23, 9, 34, 17, -2), 3.5 * weight),
    ],
  },
  noteOff: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(ScribbleUtils.loop(seed, { cx: 17, cy: 35, rx: 6, ry: 5, turns: 1.1 }), 4 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 23, 35, 23, 9, 0.5), 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 2, 23, 9, 34, 17, -2), 3.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 3, 8, 8, 40, 40), 3.5 * weight),
    ],
  },
  magnifier: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(ScribbleUtils.loop(seed, { cx: 20, cy: 20, rx: 13, ry: 13, turns: 1.08 }), 4.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 30, 30, 42, 42, 0.5), 6.5 * weight),
    ],
  },
};

/** A hand-drawn mark made with the same stroke engine as the canvas. Decorative only. */
export function BrandScribble({ shape, seed = 1, weight = 1, className }: BrandScribbleProps) {
  const { viewBox, paths } = shapes[shape];
  const data = useMemo(() => paths(seed, weight), [paths, seed, weight]);
  return (
    <svg viewBox={viewBox} className={className} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {data.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}
