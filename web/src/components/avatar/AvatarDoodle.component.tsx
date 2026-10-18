import { useMemo } from "react";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type AvatarDoodleProps = {
  seed: number;
  /** Leave out when the name is already next to the avatar; it is then decorative. */
  label?: string;
  className?: string;
};

export function AvatarDoodle({ seed, label, className }: AvatarDoodleProps) {
  const paths = useMemo(() => AvatarUtils.doodle(seed).map((points) => CanvasUtils.freehandPath(points, 4.2)), [seed]);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 100 100" className={className} {...a11y}>
      <circle cx="50" cy="50" r="50" className="fill-night-soft" />
      {paths.map((d) => (
        <path key={d} d={d} className="fill-white" />
      ))}
    </svg>
  );
}
