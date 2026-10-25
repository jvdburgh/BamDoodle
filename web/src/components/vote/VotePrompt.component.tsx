import { useId } from "react";
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
  category: string;
  /** The secret word; null for the bamboozler, as the server sends it. */
  word: string | null;
};

/**
 * The final call after the last turn: "Time's up! Who's sketchy?", the countdown, how many have voted (not for whom)
 * and the secret again, since the sheet covers the header. A tap on Vote is the vote, changeable until time's up.
 */
export function VotePrompt({ players, voted, suspected, votedIds, msLeft, category, word }: VotePromptProps) {
  const headingId = useId();
  const change = "You can change it until time’s up.";

  return (
    <section
      aria-labelledby={headingId}
      className="relative rounded-[16px_20px_18px_14px] bg-night-soft p-3 shadow-[0_6px_14px_var(--color-night-deep)] md:p-4"
    >
      <BrandSketchyFrame className={voted ? "text-white/20" : "text-sun"} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="animate-rise-in font-display text-2xl leading-tight text-sun motion-reduce:animate-none"
          >
            Time’s up! Who’s sketchy?
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full bg-night px-2.5 py-0.5 text-xs text-white/80">
              <span className="sr-only">Category: </span>
              {category}
            </span>
            <span className="font-display text-lg leading-tight">
              {word ? (
                <>
                  <span className="sr-only">Secret word: </span>
                  {word}
                </>
              ) : (
                "??? You’re the bamboozler"
              )}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="rounded-full bg-night px-3 py-1 font-display text-2xl tabular-nums">
            <span className="sr-only">Time left to vote: </span>
            {ClockUtils.format(msLeft)}
          </p>
          <p className="mt-1 text-xs whitespace-nowrap text-white/75">
            {votedIds.length} of {players.length} voted
          </p>
        </div>
      </div>

      <p className="mt-2 text-sm text-white/80 sideways:mt-1 sideways:text-xs" aria-live="polite">
        {voted ? (
          <>
            You voted <span className="font-display text-base text-sun">{voted.name}</span>. {change}
          </>
        ) : (
          <>
            Who didn’t know the word? Tap Vote on them. {change}
            {suspected && (
              <>
                {" "}
                If you don’t vote, your suspicion of <span className="font-display text-base">
                  {suspected.name}
                </span>{" "}
                counts.
              </>
            )}
          </>
        )}
      </p>
    </section>
  );
}
