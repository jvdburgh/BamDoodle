import type { ReactNode } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";

type RoomSuspectButtonProps = {
  name: string;
  avatar: AvatarStroke[];
  /** Wears the hat: marked as suspicious, or your vote. */
  suspected: boolean;
  onToggle: () => void;
  /** "suspect" while drawing (on and off), "vote" in the final vote (a tap votes, another face changes it). */
  kind?: "suspect" | "vote";
  /** Drawn over the face, like the active drawer's ring. */
  ring?: ReactNode;
  /** Size of the face. */
  className?: string;
};

/**
 * A player's face on their card, as the way to suspect them: hover or focus shows the fedora faintly over it, a tap
 * puts the hat on (it drops onto their head), another tap takes it off. In the final vote the same face is the vote:
 * a tap votes for them. The card's Suspect / Vote button under the name says the same in words.
 */
export function RoomSuspectButton({
  name,
  avatar,
  suspected,
  onToggle,
  kind = "suspect",
  ring,
  className = "",
}: RoomSuspectButtonProps) {
  return (
    <span className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        data-sound="own"
        aria-pressed={suspected}
        // The card's Suspect / Vote button is the one stop for the keyboard; the face is for pointers and taps.
        tabIndex={-1}
        aria-label={kind === "vote" ? `Vote for ${name}` : `Mark ${name} as suspicious`}
        onClick={onToggle}
        className="group grid size-full place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <AvatarDoodle
          strokes={avatar}
          hat={suspected ? "worn" : "preview"}
          backdrop={false}
          className="size-full transition-transform motion-safe:group-hover:-rotate-6 motion-safe:group-active:scale-90"
        />
      </button>
      {ring}
    </span>
  );
}
