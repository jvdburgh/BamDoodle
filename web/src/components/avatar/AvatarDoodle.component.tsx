import { useMemo } from "react";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type AvatarDoodleProps = {
  strokes: AvatarStroke[];
  /** Leave out when the name is already next to the avatar; it is then decorative. */
  label?: string;
  /**
   * The logo's fedora on the head: "worn" drops it on (the one you suspect, yourself as the bamboozler, the reveal),
   * "preview" shows it faintly on hover or focus of the surrounding `group` (the suspect button).
   */
  hat?: "worn" | "preview";
  /** False draws the lines alone, without the navy circle behind: on a navy surface (the player cards) it adds nothing. */
  backdrop?: boolean;
  /** With no backdrop: the box hugs the lines, without the empty margin (the maker's doodle in the footer, emoji-sized). */
  crop?: boolean;
  /** Holds the hat's drop back, for the reveal. */
  hatDelayMs?: number;
  className?: string;
};

/** The fedora from the logo, without the logo's navy square (`just icons` makes it). */
const HAT_SRC = "/hat.svg";

/** A player's hand-drawn face on a navy circle, so every avatar colour reads; strokes past the edge are cut off. */
export function AvatarDoodle({
  strokes,
  label,
  hat,
  backdrop = true,
  crop = false,
  hatDelayMs = 0,
  className = "",
}: AvatarDoodleProps) {
  const paths = useMemo(
    () => strokes.map((stroke) => ({ d: CanvasUtils.strokeToPath(stroke, 100, 100), fill: stroke.color })),
    [strokes],
  );
  // Without the circle, the box hugs the lines (plus half a pen width), so no empty margin is left around them.
  const viewBox = useMemo(() => {
    const points = strokes.flatMap((stroke) => stroke.points);
    if (points.length === 0) return "0 0 100 100";
    const pad = Math.max(...strokes.map((stroke) => stroke.size)) * 50;
    const xs = points.map(([x]) => x * 100);
    const ys = points.map(([, y]) => y * 100);
    const [left, top] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
    return `${left} ${top} ${Math.max(...xs) + pad - left} ${Math.max(...ys) + pad - top}`;
  }, [strokes]);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const face = (
    <svg
      viewBox={crop && !backdrop ? viewBox : "0 0 100 100"}
      className={`${backdrop ? "[clip-path:circle(50%)]" : crop ? "overflow-visible" : ""} ${hat ? "size-full" : className}`}
      {...a11y}
    >
      {backdrop && <circle cx="50" cy="50" r="50" className="fill-night-soft" />}
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
        className={`pointer-events-none absolute -top-[14%] left-1/2 w-[92%] max-w-none -translate-x-1/2 -rotate-6 ${
          hat === "worn"
            ? "animate-hat-drop motion-reduce:animate-none"
            : "opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
        }`}
      />
    </span>
  );
}
