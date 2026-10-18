import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";

const pen = (color: string, points: number[][]) => AvatarUtils.fromBox(points, color);

/** A starting face someone tweaked: pink cheeks, a yellow party hat and a scribble that runs off the circle. */
export const drawnAvatarFixture: AvatarStroke[] = [
  ...AvatarUtils.face(3),
  pen("#f9a8c0", ScribbleUtils.loop(41, { cx: 34, cy: 64, rx: 4, ry: 3 })),
  pen("#f9a8c0", ScribbleUtils.loop(42, { cx: 66, cy: 64, rx: 4, ry: 3 })),
  pen("#fbb03b", ScribbleUtils.line(43, 38, 30, 52, 4)),
  pen("#fbb03b", ScribbleUtils.line(44, 52, 4, 64, 30)),
  pen("#2da8c3", ScribbleUtils.line(45, 70, 90, 104, 60, 6)),
];
