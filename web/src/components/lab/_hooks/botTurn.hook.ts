import { useEffect, useLayoutEffect, useRef } from "react";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import type { CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";
import type { Round } from "@/components/lab/_types/lab.types";
import { BotUtils } from "@/components/lab/_utils/bot.utils";
import type { BrushSize } from "@/protocol/generated/BrushSize";

const POINT_MS = 22;
const SAFETY_MS = 400;
const MAX_TIMED_STROKES = 3;

/** What a simulated player draws with: the same steps a real player's strokes take through the server. */
export type BotPen = {
  begin: (playerId: number, colour: string, size: BrushSize, point: StrokePoint) => void;
  extend: (points: StrokePoint[]) => void;
  end: () => void;
};

/**
 * Plays a simulated player's turn: waits a moment, then draws strokes point by point, the way a remote player's
 * strokes stream in from the server. One-stroke turns get one stroke, timed turns up to three.
 */
export function useBotTurn(
  round: Round,
  botId: number | null,
  pen: BotPen,
  onStrokeEnd: (turnCount: number) => void,
  /** The bot's shade family; free colours when left out. */
  family?: CanvasColour[],
) {
  const latest = useRef({ pen, onStrokeEnd });
  useLayoutEffect(() => {
    latest.current = { pen, onStrokeEnd };
  });

  const { phase, mode, turnCount, turnStartedAt, turnMs } = round;

  useEffect(() => {
    if (phase !== "drawing" || botId === null) return;
    const rand = ScribbleUtils.random(turnStartedAt + turnCount);
    const turnEndsAt = turnStartedAt + turnMs;
    let timer = 0;
    let strokes = 0;
    let drawing = false;

    const drawStroke = () => {
      const { color, size, points } = BotUtils.stroke(rand, family);
      if (mode === "timed" && Date.now() + points.length * POINT_MS > turnEndsAt - SAFETY_MS) return;
      latest.current.pen.begin(botId, color, size, points[0] ?? [0.5, 0.5, 0.5]);
      drawing = true;
      let next = 1;
      timer = window.setInterval(() => {
        if (next < points.length) {
          latest.current.pen.extend(points.slice(next, next + 1));
          next += 1;
          return;
        }
        window.clearInterval(timer);
        latest.current.pen.end();
        drawing = false;
        latest.current.onStrokeEnd(turnCount);
        strokes += 1;
        if (mode === "timed" && strokes < MAX_TIMED_STROKES) timer = window.setTimeout(drawStroke, 400 + rand() * 1200);
      }, POINT_MS);
    };

    timer = window.setTimeout(drawStroke, 500 + rand() * 1200);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(timer);
      if (drawing) latest.current.pen.end();
    };
  }, [phase, mode, turnCount, turnStartedAt, turnMs, botId, family]);
}
