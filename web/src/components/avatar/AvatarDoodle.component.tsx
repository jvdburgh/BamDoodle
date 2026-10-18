import { useMemo } from "react";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type AvatarDoodleProps = {
  strokes: AvatarStroke[];
  /** Leave out when the name is already next to the avatar; it is then decorative. */
  label?: string;
  /** Identity colour as a ring around the face, when players have one (shade families). The circle stays navy. */
  color?: string;
  /**
   * The logo's fedora on the head: "worn" drops it on (the one you suspect, yourself as the bamboozler, the reveal),
   * "preview" shows it faintly on hover or focus of the surrounding `group` (the suspect button).
   */
  hat?: "worn" | "preview";
  /** False draws the lines alone, without the navy circle behind them (the maker's doodle in the footer). */
  backdrop?: boolean;
  /** Holds the hat's drop back, for the reveal. */
  hatDelayMs?: number;
  className?: string;
};

/** The fedora from the logo, cropped out of the same file. */
const HAT_SRC = "/logo.svg#svgView(viewBox(380,250,1500,880))";

/** A player's hand-drawn face on a navy circle, so every avatar colour reads; strokes past the edge are cut off. */
export function AvatarDoodle({
  strokes,
  label,
  color,
  hat,
  backdrop = true,
  hatDelayMs = 0,
  className = "",
}: AvatarDoodleProps) {
  const paths = useMemo(
    () => strokes.map((stroke) => ({ d: CanvasUtils.strokeToPath(stroke, 100, 100), fill: stroke.color })),
    [strokes],
  );
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const face = (
    <svg
      viewBox="0 0 100 100"
      className={`${backdrop ? "[clip-path:circle(50%)]" : "overflow-visible"} ${hat ? "size-full" : className}`}
      {...a11y}
    >
      {backdrop && <circle cx="50" cy="50" r="50" className="fill-night-soft" />}
      {color && <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="8" />}
      {paths.map(({ d, fill }, index) => (
        <path key={index} d={d} fill={fill} />
      ))}
    </svg>
  );
  if (!hat) return face;
  return (
    <span className={`relative inline-block ${className}`}>
      {face}
      <img
        src={HAT_SRC}
        alt=""
        style={hat === "worn" ? { animationDelay: `${hatDelayMs}ms` } : undefined}
        className={`pointer-events-none absolute -top-[25%] left-1/2 w-[92%] max-w-none -translate-x-1/2 -rotate-6 ${
          hat === "worn"
            ? "animate-hat-drop motion-reduce:animate-none"
            : "opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
        }`}
      />
    </span>
  );
}
