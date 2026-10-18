import { useEffect, useState } from "react";

/** The fedora from the logo, cropped out of the same file. */
const HAT_SRC = "/logo.svg#svgView(viewBox(380,250,1500,880))";
const LABEL_FLASH_MS = 1600;

type RoomSuspectButtonProps = {
  name: string;
  suspected: boolean;
  onToggle: () => void;
};

/**
 * The hat with an exclamation mark on a player card: tap to suspect that player, tap again to take it back. Its label
 * shows on hover and focus, and for a moment after a tap so touch screens see what happened, as a band across the
 * card it sits in (the nearest positioned ancestor), so it never runs off a narrow screen.
 */
export function RoomSuspectButton({ name, suspected, onToggle }: RoomSuspectButtonProps) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), LABEL_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash, suspected]);

  return (
    <button
      type="button"
      aria-pressed={suspected}
      onClick={() => {
        onToggle();
        setFlash(true);
      }}
      className={`group grid size-8 shrink-0 place-items-center rounded-full bg-night ring-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        suspected ? "ring-berry" : "ring-transparent hover:ring-white/30"
      }`}
    >
      <span className="relative grid place-items-center" aria-hidden="true">
        <img src={HAT_SRC} alt="" className="w-6" />
        <span
          className={`absolute -top-2.5 -right-2.5 grid size-4 place-items-center rounded-full font-display text-xs leading-none ${
            suspected ? "bg-berry text-night" : "bg-white text-night"
          }`}
        >
          !
        </span>
      </span>
      <span
        className={`pointer-events-none absolute inset-x-1 top-10 z-10 rounded-lg bg-night px-2 py-1 text-center text-xs font-semibold shadow-[0_3px_0_var(--color-night-deep)] transition-opacity motion-reduce:transition-none ${
          suspected ? "text-berry" : "text-white"
        } ${flash ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}
      >
        {suspected ? "Marked as suspicious" : "Mark as suspicious"}
        <span className="sr-only"> ({name})</span>
      </span>
    </button>
  );
}
