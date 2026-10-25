import { useId } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";

type VotePromptProps = {
  players: RoomPlayer[];
  /** Your vote so far; tapping another face changes it. */
  voted: RoomPlayer | undefined;
  /** Who you suspected while drawing: that counts if you don't vote. */
  suspected: RoomPlayer | undefined;
  /** Who has voted (not for whom). */
  votedIds: number[];
  msLeft: number;
};

/**
 * The final call after the last turn: "Time's up! Who's sketchy?" and the countdown. A tap on a face is the vote,
 * changeable until the time runs out or everyone has voted; who has voted shows, not for whom.
 */
export function VotePrompt({ players, voted, suspected, votedIds, msLeft }: VotePromptProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="relative rounded-[16px_20px_18px_14px] bg-night-soft p-4">
      <BrandSketchyFrame className={voted ? "text-white/20" : "text-sun"} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className="animate-rise-in font-display text-2xl leading-tight text-sun motion-reduce:animate-none"
          >
            Time’s up! Who’s sketchy?
          </h2>
          <p className="mt-0.5 text-sm text-white/80" aria-live="polite">
            {voted ? (
              <>
                You voted <span className="font-display text-base text-sun">{voted.name}</span>. Tap another face to
                change it.
              </>
            ) : suspected ? (
              <>
                Tap the face of who didn’t know the word. If you don’t, your suspicion of{" "}
                <span className="font-display text-base">{suspected.name}</span> counts.
              </>
            ) : (
              "Tap the face of who you think didn’t know the word."
            )}
          </p>
        </div>
        <p className="shrink-0 rounded-full bg-night px-3 py-1 font-display text-2xl tabular-nums">
          <span className="sr-only">Time left to vote: </span>
          {ClockUtils.format(msLeft)}
        </p>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-white/75">
        <span>
          {votedIds.length} of {players.length} voted
        </span>
        {players
          .filter((player) => votedIds.includes(player.id))
          .map((player) => (
            <AvatarDoodle
              key={player.id}
              strokes={player.avatar}
              backdrop={false}
              label={`${player.name} has voted`}
              className="size-7"
            />
          ))}
      </p>
    </section>
  );
}
