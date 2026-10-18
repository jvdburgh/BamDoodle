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
 * The hat with an exclamation mark on a player card: tap to suspect that player, tap again to take it back. The
 * label unfolds on hover and focus, and for a moment after a tap, so touch screens see what happened.
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
      className={`group inline-flex h-8 items-center rounded-full bg-night pr-1 pl-1.5 text-xs font-semibold whitespace-nowrap ring-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        suspected ? "text-berry ring-berry" : "text-white/90 ring-transparent hover:ring-white/30"
      }`}
    >
      <span className="relative grid size-6 shrink-0 place-items-center" aria-hidden="true">
        <img src={HAT_SRC} alt="" className="w-6" />
        <span
          className={`absolute -top-1 -right-1 grid size-3.5 place-items-center rounded-full font-display text-[0.7rem] leading-none ${
            suspected ? "bg-berry text-night" : "bg-white text-night"
          }`}
        >
          !
        </span>
      </span>
      <span
        className={`overflow-hidden transition-[max-width,padding] duration-200 motion-reduce:transition-none ${
          flash
            ? "max-w-40 px-1.5"
            : "max-w-0 group-hover:max-w-40 group-hover:px-1.5 group-focus-visible:max-w-40 group-focus-visible:px-1.5"
        }`}
      >
        {suspected ? "Marked as suspicious" : "Mark as suspicious"}
        <span className="sr-only"> ({name})</span>
      </span>
    </button>
  );
}
