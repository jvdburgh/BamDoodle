import { useCallback, useRef, type PointerEvent } from "react";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type PointerStrokeOptions = {
  /** False ignores new strokes, e.g. when it isn't your turn. */
  enabled: boolean;
  onBegin: (point: StrokePoint, hasPressure: boolean) => void;
  onExtend: (points: StrokePoint[]) => void;
  onEnd: () => void;
};

/**
 * Pointer Events to normalised stroke points for any drawing surface (canvas or SVG): one pointer at a time,
 * captured, with coalesced events. Spread `handlers` on the element; `stop()` lets go of a stroke without `onEnd`.
 */
export function usePointerStroke({ enabled, onBegin, onExtend, onEnd }: PointerStrokeOptions) {
  const pointerId = useRef<number | null>(null);

  const onPointerDown = (event: PointerEvent<Element>) => {
    if (!enabled || pointerId.current !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events in tests have no active pointer to capture.
    }
    pointerId.current = event.pointerId;
    const box = event.currentTarget.getBoundingClientRect();
    onBegin(CanvasUtils.normalise(event.clientX, event.clientY, event.pressure, box), event.pointerType === "pen");
  };

  const onPointerMove = (event: PointerEvent<Element>) => {
    if (event.pointerId !== pointerId.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const native = event.nativeEvent;
    const coalesced = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const events = coalesced.length > 0 ? coalesced : [native];
    onExtend(events.map((e) => CanvasUtils.normalise(e.clientX, e.clientY, e.pressure, box)));
  };

  const onPointerEnd = (event: PointerEvent<Element>) => {
    if (event.pointerId !== pointerId.current) return;
    pointerId.current = null;
    onEnd();
  };

  const isDrawing = useCallback(() => pointerId.current !== null, []);
  const stop = useCallback(() => {
    pointerId.current = null;
  }, []);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onLostPointerCapture: onPointerEnd,
    },
    isDrawing,
    stop,
  };
}
