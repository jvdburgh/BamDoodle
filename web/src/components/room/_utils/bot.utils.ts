import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasTools, type CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";

/** Stand-ins for the other players in the prototype, until there is a server to bring their real strokes. */

export type BotStroke = { color: string; size: number; points: StrokePoint[] };

const BLACK = "#000000";
const visibleOnPaper = CanvasTools.colours.filter((colour) => !["White", "Cloud"].includes(colour.name));

/**
 * A small doodle somewhere on the sheet, fine or medium. With the free palette it's black half the time, because that
 * is what most people reach for; with a shade family it picks from that family.
 */
function stroke(rand: () => number, family?: CanvasColour[]): BotStroke {
  const between = (min: number, max: number) => min + rand() * (max - min);
  const pickFrom = <T>(items: T[]) => items[Math.floor(rand() * items.length)] as T;
  const cx = between(0.2, 0.8);
  const cy = between(0.2, 0.8);
  const shape = pickFrom(["loop", "line", "zigzag"] as const);

  let raw: number[][];
  if (shape === "loop") {
    const r = between(0.025, 0.07);
    raw = ScribbleUtils.loop(Math.floor(rand() * 1e6), { cx, cy, rx: r, ry: r * between(0.8, 1.3) });
  } else if (shape === "line") {
    const angle = between(0, Math.PI * 2);
    const length = between(0.06, 0.2);
    const [dx, dy] = [(Math.cos(angle) * length) / 2, (Math.sin(angle) * length) / 2];
    raw = ScribbleUtils.line(Math.floor(rand() * 1e6), cx - dx, cy - dy, cx + dx, cy + dy, between(-0.04, 0.04));
  } else {
    const width = between(0.05, 0.12);
    const teeth = 3 + Math.floor(rand() * 4);
    raw = Array.from({ length: teeth * 2 + 1 }, (_, i) => [
      cx - width / 2 + (width * i) / (teeth * 2),
      cy + (i % 2 === 0 ? 0.02 : -0.02),
      0.5,
    ]);
  }

  return {
    color: family ? pickFrom(family).value : rand() < 0.5 ? BLACK : pickFrom(visibleOnPaper).value,
    size: pickFrom(CanvasTools.brushes.slice(0, 2)).size,
    points: raw.map(([x = 0, y = 0]) => [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)), 0.5]),
  };
}

export const BotUtils = { stroke };
