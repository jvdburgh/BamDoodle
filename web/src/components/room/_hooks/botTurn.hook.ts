import { useEffect, useLayoutEffect, useRef } from "react";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import type { CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import type { Round } from "@/components/room/_types/room.types";
import { BotUtils } from "@/components/room/_utils/bot.utils";

const POINT_MS = 22;
const SAFETY_MS = 400;
const MAX_TIMED_STROKES = 3;

/**
 * Plays a simulated player's turn: waits a moment, then draws strokes point by point into the shared drawing, the way
 * a remote player's strokes will stream in from the server. One-stroke turns get one stroke, timed turns up to three.
 */
export function useBotTurn(
  drawing: Drawing,
  round: Round,
  botId: string | null,
  onStrokeEnd: (turnCount: number) => void,
  /** The bot's shade family; free colours when left out. */
  family?: CanvasColour[],
) {
  const strokeEnd = useRef(onStrokeEnd);
  useLayoutEffect(() => {
    strokeEnd.current = onStrokeEnd;
  });

  const { phase, mode, turnCount, turnStartedAt, turnMs } = round;

  useEffect(() => {
    if (phase !== "drawing" || !botId) return;
    const rand = ScribbleUtils.random(turnStartedAt + turnCount);
    const turnEndsAt = turnStartedAt + turnMs;
    let timer = 0;
    let strokes = 0;

    const drawStroke = () => {
      const { color, size, points } = BotUtils.stroke(rand, family);
      if (mode === "timed" && Date.now() + points.length * POINT_MS > turnEndsAt - SAFETY_MS) return;
      drawing.begin({ playerId: botId, color, size, hasPressure: false }, points[0] ?? [0.5, 0.5, 0.5]);
      let next = 1;
      timer = window.setInterval(() => {
        if (next < points.length) {
          drawing.extend(points.slice(next, next + 1));
          next += 1;
          return;
        }
        window.clearInterval(timer);
        drawing.end();
        strokeEnd.current(turnCount);
        strokes += 1;
        if (mode === "timed" && strokes < MAX_TIMED_STROKES) timer = window.setTimeout(drawStroke, 400 + rand() * 1200);
      }, POINT_MS);
    };

    timer = window.setTimeout(drawStroke, 500 + rand() * 1200);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(timer);
      if (drawing.live()?.playerId === botId) drawing.end();
    };
  }, [drawing, phase, mode, turnCount, turnStartedAt, turnMs, botId, family]);
}
