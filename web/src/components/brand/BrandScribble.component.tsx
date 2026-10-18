import { useMemo } from "react";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

export type BrandScribbleShape = "ring" | "underline" | "magnifier";

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
