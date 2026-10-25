import { useEffect, useId, useRef } from "react";
import { AvatarEditor } from "@/components/avatar/AvatarEditor.component";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";

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
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-5 px-4 py-4 pb-16 md:py-8">
      <header className="flex items-center justify-between gap-3">
        <BrandLogo named href={home} className="size-10" nameClassName="sr-only text-sm sm:not-sr-only" />
        <div className="flex items-center gap-1.5">
          <p className="rounded-full bg-night-soft px-3 py-1 text-sm text-white/80">
            <span className="sr-only">Room code </span>
            <span aria-hidden="true">Room </span>
            <span className="font-display tracking-widest">{roomCode}</span>
          </p>
          <SoundToggle channel="music" />
          <SoundToggle />
        </div>
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
        </div>
        <AvatarEditor value={avatar} onChange={onAvatarChange} />
      </section>

      {/* Pinned above a phone browser's bottom bar: never under the fold, however tall the face pad is. */}
      <button
        type="button"
        onClick={onStart}
        className={`${BrandStyles.primaryButton} sticky bottom-[calc(0.75rem_+_var(--browser-bar))] z-10 w-full shadow-[0_6px_18px_var(--color-night-deep)] md:bottom-3`}
      >
        Go to the room
      </button>
    </main>
  );
}
