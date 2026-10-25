import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

/** Which setup choice to illustrate; turns, seconds and rounds draw the value that's picked (rounds up to five cards). */
export type LobbySetupSketchKind =
  | { kind: "oneStroke" }
  | { kind: "timed" }
  | { kind: "turns"; count: number }
  | { kind: "seconds"; seconds: number }
  | { kind: "rounds"; count: number }
  | { kind: "words" };

type Mark = { points: number[][]; size: number; fill: string };

const { loop, line } = ScribbleUtils;
const ink = "fill-white";

/** A stopwatch whose hand points at `fraction` of a full turn. */
function stopwatch(fraction: number): Mark[] {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return [
    { points: loop(31, { cx: 32, cy: 27, rx: 15, ry: 15 }), size: 3, fill: ink },
    { points: line(32, 32, 12, 32, 8), size: 3, fill: ink },
    { points: line(33, 28, 7, 36, 7), size: 3, fill: ink },
    { points: line(34, 32, 27, 32 + Math.cos(angle) * 10, 27 + Math.sin(angle) * 10), size: 4, fill: "fill-sun" },
    { points: loop(35, { cx: 32, cy: 27, rx: 1.4, ry: 1.4, wobble: 0 }), size: 3, fill: "fill-sun" },
  ];
}

function marks(sketch: LobbySetupSketchKind): Mark[] {
  switch (sketch.kind) {
    case "oneStroke":
      return [
        { points: line(1, 8, 36, 50, 14, 12), size: 4, fill: "fill-lagoon" },
        { points: loop(2, { cx: 54, cy: 12, rx: 2.5, ry: 2.5, wobble: 0 }), size: 3, fill: "fill-sun" },
      ];
    case "timed":
      return [
        ...stopwatch(0.3),
        { points: line(3, 4, 40, 16, 34, 3), size: 3, fill: "fill-berry" },
        { points: line(4, 48, 42, 60, 36, -3), size: 3, fill: "fill-lime" },
      ];
    case "turns": {
      const count = Math.min(sketch.count, 5);
      const tallies = Array.from({ length: Math.min(count, 4) }, (_, index) => ({
        points: line(10 + index, 16 + index * 9, 10, 14 + index * 9, 38, 1),
        size: 3.5,
        fill: "fill-sun",
      }));
      const cross = count === 5 ? [{ points: line(20, 8, 32, 50, 16, -2), size: 3.5, fill: "fill-berry" }] : [];
      return [...tallies, ...cross];
    }
    case "seconds":
      return stopwatch(sketch.seconds / 60);
    case "rounds": {
      // A stack of word cards, one per round (up to five): the front card whole, the ones behind it peeking out.
      const cards = Math.min(sketch.count, 5);
      return Array.from({ length: cards }, (_, index) => {
        const front = index === 0;
        const x = 10 + index * 6;
        const y = 18 - index * 2.5;
        const [w, h] = [18, 24];
        const edges = front
          ? [
              line(40 + index, x, y, x + w, y),
              line(41 + index, x + w, y, x + w, y + h),
              line(42 + index, x + w, y + h, x, y + h),
              line(43 + index, x, y + h, x, y),
            ]
          : [line(40 + index, x, y, x + w, y), line(41 + index, x + w, y, x + w, y + h)];
        return { points: edges.flat(), size: 2.5, fill: front ? "fill-sun" : ink };
      });
    }
    case "words":
      return [
        { points: loop(70, { cx: 32, cy: 22, rx: 22, ry: 14, wobble: 0.08 }), size: 3, fill: ink },
        { points: line(71, 22, 34, 16, 44, 1), size: 3, fill: ink },
        { points: line(72, 20, 19, 44, 18, -2), size: 3, fill: "fill-sun" },
        { points: line(73, 20, 26, 36, 26, -1), size: 3, fill: "fill-lagoon" },
      ];
  }
}

/** A small hand-drawn picture of a setup choice, drawn with the game's own pen. Decorative: the text says it all. */
export function LobbySetupSketch({ sketch, className = "" }: { sketch: LobbySetupSketchKind; className?: string }) {
  const paths = marks(sketch).map(({ points, size, fill }) => ({ d: CanvasUtils.freehandPath(points, size), fill }));
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false" className={className}>
      {paths.map(({ d, fill }, index) => (
        <path key={index} d={d} className={fill} />
      ))}
    </svg>
  );
}
