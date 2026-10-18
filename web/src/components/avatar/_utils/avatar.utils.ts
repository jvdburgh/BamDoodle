import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";

type Points = number[][];

/** A placeholder face in a 100 × 100 box, until players draw their own avatars in the lobby. */
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

export const AvatarUtils = { doodle };
