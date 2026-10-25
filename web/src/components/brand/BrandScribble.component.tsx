import { useMemo } from "react";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

export type BrandScribbleShape =
  | "ring"
  | "underline"
  | "magnifier"
  | "speaker"
  | "speakerOff"
  | "note"
  | "noteOff"
  | "door"
  | "pencil"
  | "pencilPlus"
  | "check"
  | "plus"
  | "screen"
  | "star";

const speakerBody = [
  [8, 19, 0.5],
  [15, 19, 0.5],
  [25, 10, 0.5],
  [25, 38, 0.5],
  [15, 29, 0.5],
  [8, 29, 0.5],
  [8, 19, 0.5],
];

/** A pencil from its tip at the bottom left up to its end, drawn as an outline. */
const pencil = (seed: number, weight: number) =>
  [
    ScribbleUtils.line(seed, 9, 27, 27, 9, -0.5),
    ScribbleUtils.line(seed + 1, 15, 33, 33, 15, 0.5),
    ScribbleUtils.line(seed + 2, 27, 9, 33, 15),
    ScribbleUtils.line(seed + 3, 9, 27, 5, 37, 0.3),
    ScribbleUtils.line(seed + 4, 5, 37, 15, 33, 0.3),
    ScribbleUtils.line(seed + 5, 23, 13, 29, 19),
  ].map((points) => CanvasUtils.freehandPath(points, 3.2 * weight));

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
  door: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      ...[
        // The frame, and the door swung open towards you.
        ScribbleUtils.line(seed, 26, 43, 26, 6, 0.5),
        ScribbleUtils.line(seed + 1, 26, 6, 44, 6, -0.5),
        ScribbleUtils.line(seed + 2, 44, 6, 44, 43, 0.5),
        ScribbleUtils.line(seed + 3, 26, 6, 35, 11, 0.3),
        ScribbleUtils.line(seed + 4, 35, 11, 35, 46, -0.6),
        ScribbleUtils.line(seed + 5, 35, 46, 26, 43, 0.3),
        // A loopy arrow skipping in.
        ScribbleUtils.line(seed + 6, 2, 30, 12, 22, -5),
        ScribbleUtils.line(seed + 7, 12, 22, 22, 26, -4),
        ScribbleUtils.line(seed + 8, 16, 21, 22, 26, 0.3),
        ScribbleUtils.line(seed + 9, 17, 31, 22, 26, -0.3),
      ].map((points) => CanvasUtils.freehandPath(points, 3.4 * weight)),
      CanvasUtils.freehandPath(
        ScribbleUtils.loop(seed + 10, { cx: 39, cy: 28, rx: 1.3, ry: 1.3, turns: 1 }),
        3 * weight,
      ),
    ],
  },
  pencil: { viewBox: "0 0 48 48", paths: pencil },
  pencilPlus: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      ...pencil(seed, weight),
      // The squiggle it just drew, and a plus popping out.
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 6, 3, 44, 11, 44, -2.5), 2.6 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 7, 11, 44, 19, 44, 2.5), 2.6 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 8, 38, 26, 37, 44, 0.6), 3.8 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 9, 29, 35, 46, 34, -0.6), 3.8 * weight),
    ],
  },
  screen: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      ...[
        // A wobbly telly on a stand, with a doodle on it.
        ScribbleUtils.line(seed, 5, 9, 43, 8, -0.6),
        ScribbleUtils.line(seed + 1, 43, 8, 44, 33, 0.6),
        ScribbleUtils.line(seed + 2, 44, 33, 4, 34, -0.6),
        ScribbleUtils.line(seed + 3, 4, 34, 5, 9, 0.6),
        ScribbleUtils.line(seed + 4, 24, 34, 24, 41),
        ScribbleUtils.line(seed + 5, 14, 42, 34, 41, -0.5),
      ].map((points) => CanvasUtils.freehandPath(points, 3.4 * weight)),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 6, 13, 26, 34, 17, -6), 2.6 * weight),
    ],
  },
  star: {
    viewBox: "0 0 48 48",
    // Five points in one go, the way you'd doodle a star.
    paths: (seed, weight) => {
      const tips = [0, 2, 4, 1, 3, 0].map((index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
        return [24 + Math.cos(angle) * 20, 26 + Math.sin(angle) * 20] as const;
      });
      return tips
        .slice(1)
        .map(([x, y], index) =>
          CanvasUtils.freehandPath(
            ScribbleUtils.line(seed + index, tips[index]![0], tips[index]![1], x, y, 0.8),
            3.4 * weight,
          ),
        );
    },
  },
  check: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(ScribbleUtils.line(seed, 7, 25, 18, 38, -1), 5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 18, 38, 43, 8, 3), 5 * weight),
    ],
  },
  plus: {
    viewBox: "0 0 48 48",
    paths: (seed, weight) => [
      CanvasUtils.freehandPath(ScribbleUtils.line(seed, 25, 8, 23, 41, 1), 4.5 * weight),
      CanvasUtils.freehandPath(ScribbleUtils.line(seed + 1, 8, 23, 41, 25, -1), 4.5 * weight),
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
