import { useEffect, useState } from "react";

/** One viewer's magnifying glass: a pinned player, a hover peek that wins while it lasts, and Esc to clear. */
export function useSpotlight() {
  const [pinned, setPinned] = useState<number | null>(null);
  const [peek, setPeek] = useState<number | null>(null);

  useEffect(() => {
    if (!pinned && !peek) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(null);
      setPeek(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned, peek]);

  return { pinned, shown: peek ?? pinned, pin: setPinned, setPeek };
}
