import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";
import { StrokeWireUtils } from "@/components/room/_utils/strokeWire.utils";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";

const BATCH_MS = 50;

/**
 * Sends your stroke while you draw it: the first point at once, then the points batched about every 50 ms and
 * thinned out, so the others see it live without a message per pointer event. Stops at the server's points per
 * stroke, and sends 0.5 pressure for anything but a pen.
 */
export function useStrokeSender(send: (message: ClientMessage) => void) {
  const pending = useRef<StrokePoint[]>([]);
  const last = useRef<StrokePoint | null>(null);
  const sent = useRef(0);
  const pen = useRef(false);
  const timer = useRef<number | null>(null);
  const sendRef = useRef(send);
  useLayoutEffect(() => {
    sendRef.current = send;
  });

  const flush = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const from = last.current;
    if (!from || pending.current.length === 0) return;
    const thinned = CanvasUtils.simplify([from, ...pending.current], CanvasUtils.SIMPLIFY_TOLERANCE).slice(1);
    const points = thinned.slice(0, Math.max(0, StrokeWireUtils.limits.pointsPerStroke - sent.current));
    pending.current = [];
    last.current = thinned.at(-1) ?? from;
    sent.current += points.length;
    for (const message of StrokeWireUtils.extend(StrokeWireUtils.forWire(points, pen.current)))
      sendRef.current(message);
  }, []);

  useEffect(() => flush, [flush]);

  return useMemo(
    () => ({
      begin(stroke: Stroke) {
        flush();
        pending.current = [];
        pen.current = stroke.hasPressure;
        last.current = stroke.points.at(-1) ?? null;
        sent.current = stroke.points.length;
        const points = StrokeWireUtils.forWire(stroke.points, stroke.hasPressure);
        for (const message of StrokeWireUtils.begin({ ...stroke, points })) sendRef.current(message);
      },
      extend(points: StrokePoint[]) {
        pending.current.push(...points);
        timer.current ??= window.setTimeout(flush, BATCH_MS);
      },
      end() {
        flush();
        last.current = null;
        sendRef.current({ type: "endStroke" });
      },
    }),
    [flush],
  );
}
