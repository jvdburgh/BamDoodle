import type { ReactNode } from "react";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";

/** Where people type the room code, shown without the scheme. */
export const JOIN_AT = "bamdoodle.io";

type RoomJoinCardProps = {
  roomCode: string;
  /** Bigger type for the host screen, read from across the room. */
  big?: boolean;
  /** Usually the Start round button. */
  children?: ReactNode;
};

/** How to get in: the address and the room code, the way a quiz night shows it on the big screen. */
export function RoomJoinCard({ roomCode, big = false, children }: RoomJoinCardProps) {
  return (
    <div
      className={`relative flex flex-col items-center text-center shadow-[0_6px_0_var(--color-night-deep)] ${
        big
          ? "gap-4 rounded-[20px_28px_24px_18px] bg-night px-10 py-8"
          : "gap-3 rounded-[18px_24px_20px_16px] bg-night px-6 py-5"
      }`}
    >
      <BrandSketchyFrame className="text-sun/70" />
      <p className={big ? "text-xl text-white/80" : "text-sm text-white/80"}>
        Join at <span className="font-semibold text-white">{JOIN_AT}</span> with code
      </p>
      <p className={`font-display tracking-[0.2em] ${big ? "pl-[0.2em] text-7xl" : "pl-[0.2em] text-5xl"}`}>
        <span className="sr-only">Room code </span>
        {roomCode}
      </p>
      {children}
    </div>
  );
}
