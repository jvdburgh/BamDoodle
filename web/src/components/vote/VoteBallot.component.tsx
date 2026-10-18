import { useEffect, useId, useRef, useState } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type VoteBallotProps = {
  /** Everyone but you. */
  candidates: RoomPlayer[];
  drawing: Drawing;
  /** Who you voted for; a vote is final. */
  vote: string | null;
  onVote: (playerId: string) => void;
  /** Called with the player you're considering (or null), so their lines can be spotlit while you decide. */
  onConsider?: (playerId: string | null) => void;
  /** The final call when time's up: louder heading, the frame lights up. */
  prompt?: boolean;
  /** Identity colours, when players have them. */
  colours?: Record<string, string>;
};

/**
 * Point at the bamboozler: pick a player (their lines light up on the canvas), then confirm. Open the whole round,
 * one vote, no take-backs. Meant to sit pinned at the bottom of a phone screen with the drawing visible above.
 */
export function VoteBallot({
  candidates,
  drawing,
  vote,
  onVote,
  onConsider,
  prompt = false,
  colours,
}: VoteBallotProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const headingId = useId();
  const voted = candidates.find((candidate) => candidate.id === vote);
  const considering = candidates.find((candidate) => candidate.id === picked);
  const loud = prompt && !voted;
  const resultRef = useRef<HTMLParagraphElement>(null);
  const justVoted = useRef(false);

  // The Vote button disappears once used; keep keyboard focus on the result instead of dropping it to the page.
  useEffect(() => {
    if (!voted || !justVoted.current) return;
    justVoted.current = false;
    resultRef.current?.focus();
  }, [voted]);

  const consider = (playerId: string | null) => {
    setPicked(playerId);
    onConsider?.(playerId);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`relative rounded-[16px_20px_18px_14px] p-4 transition-colors ${loud ? "bg-night-soft" : "bg-night-deep"}`}
    >
      <BrandSketchyFrame className={loud ? "text-sun" : "text-white/20"} />
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id={headingId}
          className={`font-display ${loud ? "animate-rise-in text-3xl text-sun motion-reduce:animate-none" : "text-2xl"}`}
        >
          {loud ? "Time’s up! Who’s sketchy?" : "Who’s sketchy?"}
        </h2>
        {!voted && <p className="shrink-0 text-sm text-white/65">Pick, then vote</p>}
      </div>

      {voted ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          className="mt-2 flex items-center gap-2 text-white/80 outline-none"
          aria-live="polite"
        >
          <AvatarDoodle seed={voted.avatarSeed} color={colours?.[voted.id]} className="size-8" />
          You voted <span className="font-display text-xl text-sun">{voted.name}</span>. No take-backs.
        </p>
      ) : (
        <>
          <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pt-1 pb-1">
            {candidates.map((candidate) => {
              const chosen = candidate.id === picked;
              return (
                <li key={candidate.id} className="w-20 shrink-0">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => consider(chosen ? null : candidate.id)}
                    className={`relative flex w-full flex-col items-center gap-1 rounded-[12px_14px_13px_11px] p-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      chosen
                        ? "bg-night text-sun shadow-[inset_0_0_0_2px_var(--color-sun)]"
                        : "bg-night/60 text-white hover:bg-night"
                    }`}
                  >
                    <span className="sr-only">Consider </span>
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
          {considering && (
            <button
              type="button"
              onClick={() => {
                justVoted.current = true;
                onVote(considering.id);
                onConsider?.(null);
              }}
              className={`${BrandStyles.primaryButton} mt-3 w-full`}
            >
              Vote {considering.name}
            </button>
          )}
        </>
      )}
    </section>
  );
}
