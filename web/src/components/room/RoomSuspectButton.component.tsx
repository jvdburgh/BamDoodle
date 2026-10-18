import { useEffect, useState, type ReactNode } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";

const LABEL_FLASH_MS = 1600;

type RoomSuspectButtonProps = {
  name: string;
  avatar: AvatarStroke[];
  /** Identity colour, when players have one (shade families). */
  color?: string;
  suspected: boolean;
  onToggle: () => void;
  /** Drawn over the face, like the active drawer's ring. */
  ring?: ReactNode;
  /** Size of the face. */
  className?: string;
};

/**
 * A player's face on their card, as the way to suspect them: hover or focus shows the fedora faintly over it with
 * "Mark as suspicious", a tap puts the hat on (it drops onto their head), another tap takes it off. The label shows as
 * a band across the card it sits in (the nearest positioned ancestor), and for a moment after a tap, so touch screens
 * see what happened.
 */
export function RoomSuspectButton({
  name,
  avatar,
  color,
  suspected,
  onToggle,
  ring,
  className = "",
}: RoomSuspectButtonProps) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), LABEL_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash, suspected]);

  return (
    <>
      <span className={`peer relative shrink-0 ${className}`}>
        <button
          type="button"
          aria-pressed={suspected}
          aria-label={`Mark ${name} as suspicious`}
          onClick={() => {
            onToggle();
            setFlash(true);
          }}
          className="group grid size-full place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <AvatarDoodle
            strokes={avatar}
            color={color}
            hat={suspected ? "worn" : "preview"}
            className="size-full transition-transform group-hover:-rotate-6 group-active:scale-90 motion-reduce:transition-none"
          />
        </button>
        {ring}
      </span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-1 top-12 z-10 rounded-lg bg-night px-2 py-1 text-center text-xs font-semibold shadow-[0_3px_0_var(--color-night-deep)] transition-opacity motion-reduce:transition-none ${
          suspected ? "text-berry" : "text-white"
        } ${flash ? "opacity-100" : "opacity-0 peer-hover:opacity-100 peer-has-focus-visible:opacity-100"}`}
      >
        {suspected ? "Marked as suspicious" : "Mark as suspicious"}
      </span>
    </>
  );
}
