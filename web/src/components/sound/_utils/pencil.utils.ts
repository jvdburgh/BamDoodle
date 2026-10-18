import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";

type Pencil = { pencilMove: (speed: number) => void; pencilStop: () => void };

/** Points `from` onwards, as canvas widths per second since the point before them; 0 when there's nothing new. */
function speed(points: readonly StrokePoint[], from: number, seconds: number): number {
  let distance = 0;
  for (let i = Math.max(1, from); i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    distance += Math.hypot(x1 - x0, y1 - y0);
  }
  return distance / Math.max(seconds, 1 / 60);
}

/**
 * Plays the pencil for whichever stroke is being drawn, yours or anyone else's: moves on every new batch of points
 * (not on a stroke's first point, which has no speed yet), stops when the stroke ends and when unsubscribed.
 */
function follow(drawing: Drawing, pencil: Pencil, now: () => number = () => performance.now()) {
  let strokeId: string | null = null;
  let heard = 0;
  let at = 0;
  const unsubscribe = drawing.subscribe(() => {
    const live = drawing.live();
    if (!live) {
      if (strokeId !== null) pencil.pencilStop();
      strokeId = null;
      return;
    }
    const time = now();
    if (live.id !== strokeId) {
      strokeId = live.id;
      heard = live.points.length;
      at = time;
      return;
    }
    if (live.points.length <= heard) return;
    pencil.pencilMove(speed(live.points, heard, (time - at) / 1000));
    heard = live.points.length;
    at = time;
  });
  return () => {
    unsubscribe();
    pencil.pencilStop();
  };
}

export const PencilUtils = { speed, follow };
