import { useEffect, useState } from "react";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";

type RoomSecretRevealProps = {
  category: string;
  /** The secret word; null for the bamboozler, who never gets it. */
  word: string | null;
  /** How long it stays before it moves out of the way. */
  showMs?: number;
};

/**
 * Right in your face as a round starts: "The secret word is GIRAFFE, everyone knows it except the bamboozler", or
 * "You're the bamboozler!" with the category. Worded so the word is clearly everyone's, not yours alone. It goes
 * away by itself and lets taps through, since the first turn's clock is already running; the word card in the header
 * keeps it (and is what screen readers get). Key it by the round.
 */
export function RoomSecretReveal({ category, word, showMs = 3_200 }: RoomSecretRevealProps) {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(false), showMs);
    return () => window.clearTimeout(timer);
  }, [showMs]);

  if (!shown) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 grid place-items-center p-4">
      <div
        data-testid="secret-reveal"
        className="relative grid max-w-md animate-pop-in justify-items-center gap-2 rounded-[20px_28px_24px_18px] bg-night px-8 py-7 text-center shadow-[0_10px_40px_var(--color-night-deep)] motion-reduce:animate-none"
      >
        <BrandSketchyFrame bold className="text-sun" />
        <span className="rounded-full bg-night-soft px-3 py-0.5 text-sm text-white/80">{category}</span>
        {word ? (
          <>
            <p className="text-lg text-white/80">The secret word is</p>
            <p className="font-display text-5xl text-sun">{word}</p>
            <p className="text-white/80">Everyone knows it, except the bamboozler. Draw it, but not too clearly!</p>
          </>
        ) : (
          <>
            <img src="/hat.svg" alt="" className="w-20" />
            <p className="font-display text-4xl text-berry">You’re the bamboozler!</p>
            <p className="text-white/80">Everyone else knows the word. You only know the category: blend in.</p>
          </>
        )}
      </div>
    </div>
  );
}
