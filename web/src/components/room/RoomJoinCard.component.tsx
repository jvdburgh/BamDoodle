import type { ReactNode } from "react";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { RoomJoinQr } from "@/components/room/RoomJoinQr.component";

/** Where people type the room code, shown without the scheme. */
export const JOIN_AT = "bamdoodle.io";

type RoomJoinCardProps = {
  roomCode: string;
  /** The host screen: bigger type, read from across the room, and a QR code to scan beside the code. */
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
      className={`relative flex items-center text-center shadow-[0_6px_0_var(--color-night-deep)] ${animate("animate-card-in")} ${
        big
          ? "flex-row gap-8 rounded-[20px_28px_24px_18px] bg-night px-8 py-6"
          : "flex-col gap-2 rounded-[18px_24px_20px_16px] bg-night px-4 py-3 sm:gap-3 sm:px-6 sm:py-5"
      }`}
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-[inherit] ${animate("animate-draw-in")}`}
        style={delay(150)}
      >
        <BrandSketchyFrame className="text-sun/70" />
      </span>
      {big && (
        <span className={`relative shrink-0 ${animate("animate-rise-in")}`} style={delay(300)}>
          <RoomJoinQr roomCode={roomCode} className="size-52 p-1" />
        </span>
      )}
      <div className={big ? "relative flex flex-col items-center gap-4" : "contents"}>
        <p className={`${big ? "text-2xl" : "text-sm"} text-white/80 ${animate("animate-rise-in")}`} style={delay(300)}>
          {big ? "Scan or go to " : "Join at "}
          <span className="font-semibold text-white">{JOIN_AT}</span>
          {big ? " and type" : " with code"}
        </p>
        <p
          className={`relative font-display tracking-[0.2em] ${big ? "pl-[0.2em] text-8xl" : "pl-[0.2em] text-4xl sm:text-5xl"}`}
        >
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
            <BrandScribble
              shape="underline"
              seed={roomCode.length + 5}
              weight={1.3}
              className="h-3 w-full text-berry"
            />
          </span>
        </p>
        {/* The host's Start round can't wait for the letters: it rises in with the first line. */}
        <div className={animate("animate-rise-in")} style={delay(300)}>
          {children}
        </div>
      </div>
    </div>
  );
}
