import { useLayoutEffect, useRef, useState } from "react";
import type { Stroke } from "@/components/canvas/_types/stroke.types";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";
import { StrokeWireUtils } from "@/components/room/_utils/strokeWire.utils";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { StrokeView } from "@/protocol/generated/StrokeView";

/**
 * The shared picture of the round being played, kept in step with the server's strokes. Without a round (between
 * rounds) it keeps the last picture; a new round starts a clean sheet.
 */
export function useRoomDrawing(round: RoundView | null) {
  const [drawing] = useState(DrawingUtils.createDrawing);
  const converted = useRef(new WeakMap<StrokeView, Stroke>());
  const roundNumber = useRef<number | null>(null);
  const number = round?.number ?? null;
  const strokes = round?.strokes;

  useLayoutEffect(() => {
    if (!strokes) return;
    if (roundNumber.current !== number) drawing.clear();
    roundNumber.current = number;
    const toStroke = (view: StrokeView) => {
      let stroke = converted.current.get(view);
      if (!stroke) {
        stroke = StrokeWireUtils.toStroke(view);
        converted.current.set(view, stroke);
      }
      return stroke;
    };
    const live = strokes.findLast((view) => !view.done);
    drawing.sync(strokes.filter((view) => view !== live).map(toStroke), live ? toStroke(live) : null);
  }, [drawing, number, strokes]);

  return drawing;
}
