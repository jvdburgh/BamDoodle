import { useEffect, useId, useRef, useState } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

type VoteBallotProps = {
  /** Everyone but you. */
  candidates: RoomPlayer[];
  /** Everyone, for showing who has voted. */
  players: RoomPlayer[];
  drawing: Drawing;
  /**
   * "suspect" while drawing: tap who you suspect, change your mind any time; everyone sees it.
   * "final" after the last turn: your suspicion is pre-selected, lock it in before the time runs out.
   */
  mode: "suspect" | "final";
  /** Who you suspect now. */
  suspicion: string | null;
  /** Your locked final vote. */
  vote: string | null;
  onSuspect: (playerId: string | null) => void;
  onVote: (playerId: string) => void;
  /** Called with the player you're looking at (or null), so their lines can be spotlit. */
  onConsider?: (playerId: string | null) => void;
  /** Who has locked a vote (not for whom). */
  votedIds?: string[];
  /** Time left to vote, for the final countdown. */
  msLeft?: number;
  /** Identity colours, when players have them. */
  colours?: Record<string, string>;
};

/**
 * Who's sketchy? Sits at the bottom of a phone screen with the drawing visible above. While drawing you mark who you
 * suspect; when time's up you lock in a final vote (your suspicion counts if you don't).
 */
export function VoteBallot({
  candidates,
  players,
  drawing,
  mode,
  suspicion,
  vote,
  onSuspect,
  onVote,
  onConsider,
  votedIds = [],
  msLeft = 0,
  colours,
}: VoteBallotProps) {
  const [picked, setPicked] = useState<string | null>(suspicion);
  const headingId = useId();
  const resultRef = useRef<HTMLParagraphElement>(null);
  const justVoted = useRef(false);
  const final = mode === "final";
  const selected = final ? picked : suspicion;
  const voted = candidates.find((candidate) => candidate.id === vote);
  const choice = candidates.find((candidate) => candidate.id === selected);

  // The lock-in button disappears once used; keep keyboard focus on the result instead of dropping it to the page.
  useEffect(() => {
    if (!voted || !justVoted.current) return;
    justVoted.current = false;
    resultRef.current?.focus();
  }, [voted]);

  const choose = (playerId: string) => {
    const next = selected === playerId ? null : playerId;
    if (final) setPicked(next);
    else onSuspect(next);
    onConsider?.(next);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`relative rounded-[16px_20px_18px_14px] p-4 transition-colors ${final && !voted ? "bg-night-soft" : "bg-night-deep"}`}
    >
      <BrandSketchyFrame className={final && !voted ? "text-sun" : "text-white/20"} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className={`font-display ${final && !voted ? "animate-rise-in text-3xl text-sun motion-reduce:animate-none" : "text-2xl"}`}
          >
            {final ? "Time’s up! Who’s sketchy?" : "Who’s sketchy?"}
          </h2>
          <p className="mt-0.5 text-sm text-white/75">
            {final
              ? voted
                ? "Waiting for the others…"
                : "Who do you think didn’t know the word?"
              : "Tap who you suspect. You can change your mind."}
          </p>
        </div>
        {final && (
          <p className="shrink-0 rounded-full bg-night px-3 py-1 font-display text-2xl tabular-nums">
            <span className="sr-only">Time left to vote: </span>
            {RoundUtils.formatClock(msLeft)}
          </p>
        )}
      </div>

      {voted ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          className="mt-3 flex items-center gap-2 text-white/85 outline-none"
          aria-live="polite"
        >
          <AvatarDoodle seed={voted.avatarSeed} color={colours?.[voted.id]} className="size-8" />
          You voted <span className="font-display text-xl text-sun">{voted.name}</span>. No take-backs.
        </p>
      ) : (
        <>
          <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pt-1 pb-1">
            {candidates.map((candidate) => {
              const chosen = candidate.id === selected;
              return (
                <li key={candidate.id} className="w-20 shrink-0">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => choose(candidate.id)}
                    className={`relative flex w-full flex-col items-center gap-1 rounded-[12px_14px_13px_11px] p-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      chosen
                        ? "bg-night text-sun shadow-[inset_0_0_0_2px_var(--color-sun)]"
                        : "bg-night/60 text-white hover:bg-night"
                    }`}
                  >
                    <span className="sr-only">{final ? "Choose " : "Suspect "}</span>
                    <CanvasMiniMap drawing={drawing} playerId={candidate.id} />
                    <span className="flex max-w-full items-center gap-1">
                      <AvatarDoodle
                        seed={candidate.avatarSeed}
                        color={colours?.[candidate.id]}
                        className="size-5 shrink-0"
                      />
                      <span className="truncate">{candidate.name}</span>
                    </span>
                    {chosen && (
                      <BrandScribble
                        shape="ring"
                        seed={candidate.avatarSeed}
                        weight={0.8}
                        className="pointer-events-none absolute -inset-1 h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)] text-sun"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {final && (
            <button
              type="button"
              disabled={!choice}
              onClick={() => {
                if (!choice) return;
                justVoted.current = true;
                onVote(choice.id);
                onConsider?.(null);
              }}
              className={`${BrandStyles.primaryButton} mt-3 w-full`}
            >
              {choice ? `Lock in my vote for ${choice.name}` : "Pick someone first"}
            </button>
          )}
        </>
      )}

      {final && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
          <span>
            {votedIds.length} of {players.length} voted
          </span>
          {players
            .filter((player) => votedIds.includes(player.id))
            .map((player) => (
              <AvatarDoodle
                key={player.id}
                seed={player.avatarSeed}
                color={colours?.[player.id]}
                label={`${player.name} has voted`}
                className="size-6"
              />
            ))}
        </p>
      )}
    </section>
  );
}
