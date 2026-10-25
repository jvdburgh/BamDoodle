import type { AvatarEdit, AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import type { AvatarStroke as WireAvatarStroke } from "@/protocol/generated/AvatarStroke";

type Points = number[][];

/** One pen for avatars, as a fraction of the avatar's width: the weight of the doodle faces. */
const brushSize = 0.042;

/** The canvas colours that read on the navy circle, white first. */
const colours = ["White", "Peach", "Blush", "Berry", "Tomato", "Sun", "Lemon", "Lime", "Lagoon", "Violet"].flatMap(
  (name) => CanvasTools.colours.filter((colour) => colour.name === name),
);

/** The doodle faces' colour, and the pen players start with. */
const white = "#ffffff";

/** What one avatar may hold, so it fits in one message to the room (server limit: 16 KiB). */
const limits = { strokes: 48, points: 700 };

/** Coarser than the main canvas: an avatar is small on every screen, and it goes to everyone in the room. */
const SIMPLIFY_TOLERANCE = 0.006;

/** A random face in a 100 × 100 box, repeatable for the same seed: where every avatar starts. */
function doodle(seed: number): Points[] {
  const rand = ScribbleUtils.random(seed);
  const pick = (count: number) => Math.floor(rand() * count);
  const rx = 26 + rand() * 6;
  const ry = 25 + rand() * 7;
  const cy = 56;
  const eyeY = cy - 4 + rand() * 4;
  const eyeGap = 9 + rand() * 4;
  const mouthY = cy + 12 + rand() * 4;

  const strokes: Points[] = [ScribbleUtils.loop(seed, { cx: 50, cy, rx, ry, turns: 1.06, wobble: 0.07 })];

  for (const side of [-1, 1]) {
    const x = 50 + side * eyeGap;
    const style = seed % 3;
    if (style === 0) strokes.push(ScribbleUtils.loop(seed + side, { cx: x, cy: eyeY, rx: 2, ry: 2.4, wobble: 0 }));
    if (style === 1) strokes.push(ScribbleUtils.line(seed + side, x, eyeY - 4, x, eyeY + 3));
    if (style === 2) strokes.push(ScribbleUtils.line(seed + side, x - 4, eyeY, x + 4, eyeY, 3));
  }

  const mouth = pick(3);
  if (mouth === 0) strokes.push(ScribbleUtils.line(seed + 3, 40, mouthY, 60, mouthY, -6));
  if (mouth === 1) strokes.push(ScribbleUtils.line(seed + 3, 42, mouthY + 1, 58, mouthY - 1));
  if (mouth === 2) strokes.push(ScribbleUtils.loop(seed + 3, { cx: 50, cy: mouthY, rx: 3.5, ry: 4.5, wobble: 0.05 }));

  const top = cy - ry;
  const extra = pick(4);
  if (extra === 0) {
    for (const dx of [-8, 0, 8])
      strokes.push(ScribbleUtils.line(seed + dx, 50 + dx, top + 2, 50 + dx * 1.4, top - 10, 2));
  }
  if (extra === 1) {
    strokes.push(ScribbleUtils.line(seed + 5, 54, top + 1, 60, top - 13, 2));
    strokes.push(ScribbleUtils.loop(seed + 6, { cx: 61, cy: top - 16, rx: 3, ry: 3, wobble: 0 }));
  }
  if (extra === 2) {
    for (const side of [-1, 1]) {
      strokes.push(ScribbleUtils.loop(seed + side * 7, { cx: 50 + side * (rx + 2), cy, rx: 4, ry: 7, wobble: 0.05 }));
    }
  }
  if (extra === 3) {
    strokes.push(ScribbleUtils.line(seed + 8, 24, top + 6, 76, top + 4, -2));
    strokes.push(ScribbleUtils.line(seed + 9, 34, top + 4, 40, top - 12, 2));
    strokes.push(ScribbleUtils.line(seed + 10, 40, top - 12, 62, top - 13, -2));
    strokes.push(ScribbleUtils.line(seed + 11, 62, top - 13, 66, top + 4, 2));
  }
  return strokes;
}

/** Normalised points to an avatar stroke in the one avatar pen, thinned out to what's worth sending. */
function stroke(points: StrokePoint[], color: string, hasPressure = false): AvatarStroke {
  return { color, size: brushSize, hasPressure, points: CanvasUtils.simplify(points, SIMPLIFY_TOLERANCE) };
}

/** Points in a 100 × 100 box (doodles, scribbles) to an avatar stroke. */
function fromBox(points: number[][], color = white): AvatarStroke {
  const round = (value: number) => Math.round(value * 100) / 10000;
  return stroke(
    points.map(([x = 0, y = 0]): StrokePoint => [round(x), round(y), 0.5]),
    color,
  );
}

/** The doodle face as avatar strokes, the shape players start from and can draw over. */
function face(seed: number): AvatarStroke[] {
  return doodle(seed).map((points) => fromBox(points));
}

const pointCount = (strokes: AvatarStroke[]) => strokes.reduce((count, { points }) => count + points.length, 0);

/** True when one more stroke would take the avatar past `limits`. */
function isFull(strokes: AvatarStroke[], next: AvatarStroke): boolean {
  return strokes.length >= limits.strokes || pointCount(strokes) + next.points.length > limits.points;
}

/** The avatar after an edit; the same array when nothing changes (a stroke past the limits, clearing nothing). */
function edit(strokes: AvatarStroke[], action: AvatarEdit): AvatarStroke[] {
  switch (action.kind) {
    case "draw":
      return isFull(strokes, action.stroke) ? strokes : [...strokes, action.stroke];
    case "clear":
      return strokes.length === 0 ? strokes : [];
    case "randomize":
      return face(action.seed);
  }
}

/** An avatar as it goes to the server: no size (one pen), points at 3 decimals to keep the message small. */
function toWire(strokes: AvatarStroke[]): WireAvatarStroke[] {
  return strokes.map(({ color, hasPressure, points }) => ({
    colour: color,
    pressure: hasPressure,
    points: points.map(([x, y, pressure]) => [
      CanvasUtils.round(x, 3),
      CanvasUtils.round(y, 3),
      CanvasUtils.round(pressure, 3),
    ]),
  }));
}

/** An avatar from the server, in the one avatar pen. */
function fromWire(strokes: WireAvatarStroke[]): AvatarStroke[] {
  return strokes.map(({ colour, pressure, points }) => ({
    color: colour,
    size: brushSize,
    hasPressure: pressure,
    points,
  }));
}

export const AvatarUtils = {
  brushSize,
  colours,
  white,
  limits,
  doodle,
  stroke,
  fromBox,
  face,
  isFull,
  edit,
  toWire,
  fromWire,
};
