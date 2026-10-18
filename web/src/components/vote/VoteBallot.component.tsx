import { useId } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type VoteBallotProps = {
  /** Everyone but you. */
  candidates: RoomPlayer[];
  /** Who you voted for; a vote is final. */
  vote: string | null;
  onVote: (playerId: string) => void;
  disabled?: boolean;
};

/** Point at the bamboozler. Open the whole round, one vote, no take-backs. */
export function VoteBallot({ candidates, vote, onVote, disabled = false }: VoteBallotProps) {
  const voted = candidates.find((candidate) => candidate.id === vote);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-[14px_18px_16px_12px] bg-night-deep/60 p-3">
      <h2 id={headingId} className="font-display text-xl">
        Who’s sketchy?
      </h2>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {candidates.map((candidate) => {
          const chosen = candidate.id === vote;
          return (
            <li key={candidate.id}>
              <button
                type="button"
                // aria-disabled rather than disabled, so the button you just pressed keeps keyboard focus.
                aria-disabled={disabled || vote !== null}
                aria-pressed={chosen}
                onClick={() => !disabled && vote === null && onVote(candidate.id)}
                className={`relative flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-[disabled=false]:hover:bg-night-soft aria-disabled:cursor-default ${
                  chosen ? "bg-night-soft text-sun" : "bg-night text-white"
                } ${vote !== null && !chosen ? "opacity-40" : ""}`}
              >
                <AvatarDoodle seed={candidate.avatarSeed} className="size-6" />
                <span className="sr-only">Vote for </span>
                {candidate.name}
                {chosen && (
                  <BrandScribble
                    shape="ring"
                    seed={candidate.avatarSeed}
                    weight={1.6}
                    className="absolute -inset-1 h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)] text-sun"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 h-5 text-sm text-white/65" aria-live="polite">
        {voted ? `You voted ${voted.name}` : ""}
      </p>
    </section>
  );
}
