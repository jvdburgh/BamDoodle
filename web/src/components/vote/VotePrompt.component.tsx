import { useEffect, useId, useRef } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

type VotePromptProps = {
  players: RoomPlayer[];
  /** Who you picked on the player cards (pre-selected from your suspicion). */
  picked: RoomPlayer | undefined;
  /** Your locked vote. */
  voted: RoomPlayer | undefined;
  onLock: (playerId: string) => void;
  /** Who has locked a vote (not for whom). */
  votedIds: string[];
  msLeft: number;
  colours?: Record<string, string>;
};

/**
 * The final call after the last turn: "Time's up! Who's sketchy?", the countdown and the button that locks in the
 * player you picked on their card. Unlocked picks count when the time runs out; who has voted shows, not for whom.
 */
export function VotePrompt({ players, picked, voted, onLock, votedIds, msLeft, colours }: VotePromptProps) {
  const headingId = useId();
  const resultRef = useRef<HTMLParagraphElement>(null);
  const justVoted = useRef(false);

  // The lock-in button disappears once used; keep keyboard focus on the result instead of dropping it to the page.
  useEffect(() => {
    if (!voted || !justVoted.current) return;
    justVoted.current = false;
    resultRef.current?.focus();
  }, [voted]);

  return (
    <section
      aria-labelledby={headingId}
      className={`relative rounded-[16px_20px_18px_14px] p-4 ${voted ? "bg-night-deep" : "bg-night-soft"}`}
    >
      <BrandSketchyFrame className={voted ? "text-white/20" : "text-sun"} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className={`font-display text-2xl leading-tight ${voted ? "" : "animate-rise-in text-sun motion-reduce:animate-none"}`}
          >
            Time’s up! Who’s sketchy?
          </h2>
          <p className="mt-0.5 text-sm text-white/80">
            {voted ? "Waiting for the others…" : "Who do you think didn’t know the word? Pick them on their card."}
          </p>
        </div>
        <p className="shrink-0 rounded-full bg-night px-3 py-1 font-display text-2xl tabular-nums">
          <span className="sr-only">Time left to vote: </span>
          {RoundUtils.formatClock(msLeft)}
        </p>
      </div>

      {voted ? (
        <p ref={resultRef} tabIndex={-1} className="mt-3 flex items-center gap-2 outline-none" aria-live="polite">
          <AvatarDoodle strokes={voted.avatar} color={colours?.[voted.id]} className="size-8" />
          You voted <span className="font-display text-xl text-sun">{voted.name}</span>. No take-backs.
        </p>
      ) : (
        <button
          type="button"
          disabled={!picked}
          onClick={() => {
            if (!picked) return;
            justVoted.current = true;
            onLock(picked.id);
          }}
          className={`${BrandStyles.primaryButton} mt-3 w-full`}
        >
          {picked ? `Lock in my vote for ${picked.name}` : "Pick someone on the cards"}
        </button>
      )}

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
              color={colours?.[player.id]}
              label={`${player.name} has voted`}
              className="size-6"
            />
          ))}
      </p>
    </section>
  );
}
