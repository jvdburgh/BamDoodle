import { useEffect, useId, useRef } from "react";
import { AvatarEditor } from "@/components/avatar/AvatarEditor.component";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

type LobbyWaitingProps = {
  name: string;
  roomCode: string;
  avatar: AvatarStroke[];
  onAvatarChange: (strokes: AvatarStroke[]) => void;
  onStart: () => void;
  /** Where the logo goes: the start page. */
  home?: string;
};

/** Between joining and the first round: draw your face while the others arrive. */
export function LobbyWaiting({ name, roomCode, avatar, onAvatarChange, onStart, home = "/" }: LobbyWaitingProps) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  // The button that brought you here is gone; start reading from the heading.
  useEffect(() => heading.current?.focus(), []);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-5 px-4 py-4 md:py-8">
      <header className="flex items-center justify-between gap-3">
        <BrandLogo named href={home} className="size-10" />
        <p className="rounded-full bg-night-soft px-3 py-1 text-sm text-white/80">
          <span className="sr-only">Room code </span>
          <span aria-hidden="true">Room </span>
          <span className="font-display tracking-widest">{roomCode}</span>
        </p>
      </header>

      <section
        aria-labelledby={headingId}
        className="relative grid justify-items-center gap-4 rounded-[18px_24px_20px_16px] bg-night-soft/50 px-4 py-5"
      >
        <BrandSketchyFrame className="text-white/25" />
        <div className="text-center">
          <h2 id={headingId} ref={heading} tabIndex={-1} className="font-display text-2xl outline-none">
            Hi {name}! Draw your face
          </h2>
          <p className="text-white/70">Doodle over this one, or shuffle for another.</p>
        </div>
        <AvatarEditor value={avatar} onChange={onAvatarChange} />
      </section>

      <button type="button" onClick={onStart} className={`${BrandStyles.primaryButton} w-full`}>
        Go to the room
      </button>
    </main>
  );
}
