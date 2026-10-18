import { useCallback, useEffect, useRef } from "react";
import { useCanvasSize } from "@/components/canvas/_hooks/canvasSize.hook";
import { useFrame } from "@/components/canvas/_hooks/frame.hook";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";

type CanvasMiniMapProps = {
  drawing: Drawing;
  playerId: number;
  /** Leave out when the mini-map sits inside a control that already names the player; it is then decorative. */
  label?: string;
};

/** The shared canvas in miniature, showing one player's strokes only, live. */
export function CanvasMiniMap({ drawing, playerId, label }: CanvasMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const schedule = useFrame(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const layer = drawing.layer(playerId);
    if (layer) context.drawImage(layer, 0, 0, canvas.width, canvas.height);
  });

  useCanvasSize(
    canvasRef,
    useCallback(() => schedule(), [schedule]),
  );

  useEffect(
    () =>
      drawing.subscribe((changed) => {
        if (changed === null || changed === playerId) schedule();
      }),
    [drawing, playerId, schedule],
  );
  useEffect(schedule, [schedule, playerId]);

  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return <canvas ref={canvasRef} className="block aspect-[4/3] w-full rounded-[5px_7px_6px_4px] bg-paper" {...a11y} />;
}
