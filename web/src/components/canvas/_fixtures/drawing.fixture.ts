import { giraffeStrokesFixture } from "@/components/canvas/_fixtures/strokes.fixture";
import type { Stroke } from "@/components/canvas/_types/stroke.types";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";

/** A drawing with strokes already on it, sized so its layers exist before any canvas mounts. */
export function drawingFixture(strokes: Stroke[] = giraffeStrokesFixture) {
  const drawing = DrawingUtils.createDrawing();
  drawing.load(strokes);
  drawing.claim(drawing, 800, 600);
  return drawing;
}
