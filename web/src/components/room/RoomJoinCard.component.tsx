import type { ReactNode } from "react";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";

/** Where people type the room code, shown without the scheme. */
export const JOIN_AT = "bamdoodle.io";

type RoomJoinCardProps = {
  roomCode: string;
  /** Bigger type for the host screen, read from across the room. */
  big?: boolean;
  /**
   * Plays the one orchestrated moment of the app, right after you create a room: the card lands, its frame is drawn
   * in, the code's letters pop in one by one and get underlined, while the action below is there almost at once.
   * Reduced motion skips it.
   */
  reveal?: boolean;
  /** Usually the Start round button. */
  children?: ReactNode;
};

const LETTERS_START_MS = 550;
const LETTER_STEP_MS = 150;

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** How to get in: the address and the room code, the way a quiz night shows it on the big screen. */
export function RoomJoinCard({ roomCode, big = false, reveal = false, children }: RoomJoinCardProps) {
  const lettersEnd = LETTERS_START_MS + roomCode.length * LETTER_STEP_MS;
  const animate = (animation: string) => (reveal ? `${animation} motion-reduce:animate-none` : "");

  return (
    <div
      className={`relative flex flex-col items-center text-center shadow-[0_6px_0_var(--color-night-deep)] ${animate("animate-card-in")} ${
        big
          ? "gap-4 rounded-[20px_28px_24px_18px] bg-night px-10 py-8"
          : "gap-3 rounded-[18px_24px_20px_16px] bg-night px-6 py-5"
      }`}
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-[inherit] ${animate("animate-draw-in")}`}
        style={delay(150)}
      >
        <BrandSketchyFrame className="text-sun/70" />
      </span>
      <p className={`${big ? "text-xl" : "text-sm"} text-white/80 ${animate("animate-rise-in")}`} style={delay(300)}>
        Join at <span className="font-semibold text-white">{JOIN_AT}</span> with code
      </p>
      <p className={`relative font-display tracking-[0.2em] ${big ? "pl-[0.2em] text-7xl" : "pl-[0.2em] text-5xl"}`}>
        <span className="sr-only">Room code {roomCode}</span>
        <span aria-hidden="true">
          {roomCode.split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className={`inline-block ${animate("animate-letter-in")}`}
              style={delay(LETTERS_START_MS + index * LETTER_STEP_MS)}
            >
              {letter}
            </span>
          ))}
        </span>
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 -bottom-2 block ${animate("animate-draw-in")}`}
          style={delay(lettersEnd)}
        >
          <BrandScribble shape="underline" seed={roomCode.length + 5} weight={1.3} className="h-3 w-full text-berry" />
        </span>
      </p>
      {/* The host's Start round can't wait for the letters: it rises in with the first line. */}
      <div className={animate("animate-rise-in")} style={delay(300)}>
        {children}
      </div>
    </div>
  );
}
