import { useMemo } from "react";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type AvatarDoodleProps = {
  strokes: AvatarStroke[];
  /** Leave out when the name is already next to the avatar; it is then decorative. */
  label?: string;
  /** Identity colour as a ring around the face, when players have one (shade families). The circle stays navy. */
  color?: string;
  className?: string;
};

/** A player's hand-drawn face on a navy circle, so every avatar colour reads; strokes past the edge are cut off. */
export function AvatarDoodle({ strokes, label, color, className = "" }: AvatarDoodleProps) {
  const paths = useMemo(
    () => strokes.map((stroke) => ({ d: CanvasUtils.strokeToPath(stroke, 100, 100), fill: stroke.color })),
    [strokes],
  );
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 100 100" className={`[clip-path:circle(50%)] ${className}`} {...a11y}>
      <circle cx="50" cy="50" r="50" className="fill-night-soft" />
      {color && <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="8" />}
      {paths.map(({ d, fill }, index) => (
        <path key={index} d={d} fill={fill} />
      ))}
    </svg>
  );
}
