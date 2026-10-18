import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { useCanvasSize } from "@/components/canvas/_hooks/canvasSize.hook";
import { useFrame } from "@/components/canvas/_hooks/frame.hook";
import type { Stroke } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";

const FADED_ALPHA = 0.14;

type CanvasBoardProps = {
  drawing: Drawing;
  /** Player ids in the order their layers are stacked. */
  order: string[];
  /** Who draws with the next stroke; null locks the canvas. */
  activePlayerId: string | null;
  color: string;
  brushSize: number;
  /** Whose strokes stand out while everyone else's fade back. */
  spotlightId?: string | null;
  label: string;
  /** Follows the pen tip while a stroke is being drawn, so everyone sees who is drawing. */
  penTag?: ReactNode;
  onStrokeEnd?: (stroke: Stroke) => void;
  /** Overlays on top of the paper (start card, turn call-out). */
  children?: ReactNode;
};

export function CanvasBoard({
  drawing,
  order,
  activePlayerId,
  color,
  brushSize,
  spotlightId = null,
  label,
  penTag,
  onStrokeEnd,
  children,
}: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const halo = useRef<string | null>(null);

  const schedule = useFrame(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const id of order) {
      if (id === spotlightId) continue;
      const layer = drawing.layer(id);
      if (!layer) continue;
      context.globalAlpha = spotlightId ? FADED_ALPHA : 1;
      context.filter = spotlightId ? "grayscale(1)" : "none";
      context.drawImage(layer, 0, 0, canvas.width, canvas.height);
    }
    context.globalAlpha = 1;
    context.filter = "none";

    const spotlit = spotlightId ? drawing.layer(spotlightId) : null;
    if (spotlit) {
      // A halo in the sheet's own colour lifts the spotlit strokes off the faded ones underneath.
      halo.current ??= rootRef.current ? getComputedStyle(rootRef.current).backgroundColor : "white";
      context.shadowColor = halo.current;
      context.shadowBlur = 6 * (window.devicePixelRatio || 1);
      context.drawImage(spotlit, 0, 0, canvas.width, canvas.height);
      context.shadowColor = "transparent";
      context.drawImage(spotlit, 0, 0, canvas.width, canvas.height);
    }

    const tag = tagRef.current;
    const tip = drawing.live()?.points.at(-1);
    if (tag) {
      tag.hidden = !tip;
      if (tip) {
        tag.style.left = `${tip[0] * 100}%`;
        tag.style.top = `${tip[1] * 100}%`;
      }
    }
  });

  useCanvasSize(
    canvasRef,
    useCallback(
      (width: number, height: number) => {
        drawing.claim(canvasRef, width, height);
        schedule();
      },
      [drawing, schedule],
    ),
  );

  useEffect(() => () => drawing.release(canvasRef), [drawing]);
  useEffect(() => drawing.subscribe(schedule), [drawing, schedule]);
  useEffect(schedule, [schedule, order, spotlightId]);

  useEffect(
    () => () => {
      // The turn moved on mid-stroke: keep what was drawn so far, for the player who drew it.
      if (pointerId.current === null) return;
      pointerId.current = null;
      drawing.end();
    },
    [activePlayerId, drawing],
  );

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!activePlayerId || pointerId.current !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events in tests have no active pointer to capture.
    }
    pointerId.current = event.pointerId;
    const box = event.currentTarget.getBoundingClientRect();
    drawing.begin(
      { playerId: activePlayerId, color, size: brushSize, hasPressure: event.pointerType === "pen" },
      CanvasUtils.normalise(event.clientX, event.clientY, event.pressure, box),
    );
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== pointerId.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const native = event.nativeEvent;
    const coalesced = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const events = coalesced.length > 0 ? coalesced : [native];
    drawing.extend(events.map((e) => CanvasUtils.normalise(e.clientX, e.clientY, e.pressure, box)));
  };

  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== pointerId.current) return;
    pointerId.current = null;
    const stroke = drawing.end();
    if (stroke) onStrokeEnd?.(stroke);
  };

  return (
    <div ref={rootRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px_14px_12px_9px] bg-paper">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={`absolute inset-0 size-full touch-none ${activePlayerId ? "cursor-crosshair" : "cursor-default"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
      />
      <div ref={tagRef} hidden className="pointer-events-none absolute translate-x-3 -translate-y-[calc(100%+6px)]">
        {penTag}
      </div>
      {children}
    </div>
  );
}
