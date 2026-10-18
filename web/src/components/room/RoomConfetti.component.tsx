import { useMemo } from "react";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";

const colours = ["text-berry", "text-sun", "text-lagoon", "text-lime", "text-violet", "text-iris"];
const PIECES = 40;

/** Hand-drawn confetti falling once over its positioned parent. Decorative; reduced motion hides it. */
export function RoomConfetti() {
  const pieces = useMemo(() => {
    const rand = ScribbleUtils.random(42);
    return Array.from({ length: PIECES }, (_, index) => ({
      index,
      left: rand() * 100,
      delay: rand() * 900,
      duration: 2_200 + rand() * 1_600,
      size: 0.8 + rand() * 1.2,
      shape: rand() < 0.5 ? ("ring" as const) : ("underline" as const),
      colour: colours[index % colours.length],
    }));
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {pieces.map((piece) => (
        <span
          key={piece.index}
          className={`absolute -top-8 animate-confetti ${piece.colour}`}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}rem`,
            height: `${piece.shape === "ring" ? piece.size : piece.size / 3}rem`,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.duration}ms`,
          }}
        >
          <BrandScribble shape={piece.shape} seed={piece.index + 1} weight={1.6} className="size-full" />
        </span>
      ))}
    </div>
  );
}
