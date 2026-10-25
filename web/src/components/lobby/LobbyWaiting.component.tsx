import { useEffect, useId, useRef } from "react";
import { AvatarEditor } from "@/components/avatar/AvatarEditor.component";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyHeader } from "@/components/lobby/LobbyHeader.component";

type LobbyWaitingProps = {
  name: string;
  roomCode: string;
  avatar: AvatarStroke[];
  onAvatarChange: (strokes: AvatarStroke[]) => void;
  /** Done with your face: only then do you count as ready in the room. */
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
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-5 px-4 py-4 md:py-8 sideways:max-w-3xl sideways:gap-3 sideways:py-3 sideways:pb-3">
      <LobbyHeader roomCode={roomCode} home={home} />

      <section
        aria-labelledby={headingId}
        className="relative grid justify-items-center gap-4 rounded-[18px_24px_20px_16px] bg-night-soft/50 px-4 py-5 sideways:gap-2 sideways:py-4"
      >
        <BrandSketchyFrame className="text-white/25" />
        <h2
          id={headingId}
          ref={heading}
          tabIndex={-1}
          className="text-center font-display text-2xl outline-none sideways:text-xl"
        >
          Hi {name}! Draw your face
        </h2>
        <AvatarEditor value={avatar} onChange={onAvatarChange}>
          <button type="button" onClick={onStart} className={`${BrandStyles.primaryButton} w-full sideways:max-w-64`}>
            Yep, that’s me!
          </button>
        </AvatarEditor>
      </section>
    </main>
  );
}
