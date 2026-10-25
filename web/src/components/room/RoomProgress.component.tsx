import type { ReactNode } from "react";
import type { RoomPhase } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";

type RoomProgressProps = {
  /** Which word (round) of how many: "Word 2 of 5". */
  roundNumber: number;
  rounds: number;
  /** Which of their turns the players are on, and how many each gets. */
  turn: number;
  turnsPerPlayer: number;
  phase: RoomPhase;
  /** "Your turn", "Your turn: one line!" or "Juno's turn" while drawing. */
  turnTitle?: string;
  /** Says what's going on instead of whose turn it is: "Line done, passing on…". */
  note?: string;
  /** Time left in the turn (drawing) or the vote (voting). */
  msLeft: number;
  msTotal: number;
  /** The first line: the category and the word, or that you're the bamboozler (`RoomWordCard inline`). */
  secret?: ReactNode;
};

const phaseNames: Partial<Record<RoomPhase, string>> = {
  lobby: "Waiting to start",
  voting: "Final vote",
  guessing: "The reveal",
  finished: "Results",
};

/**
 * The round banner, full width over the drawing: the secret on the first line, then whose turn it is with its
 * seconds, which word of how many, and the countdown as a bar across. Never "Round" next to "Turn": the rounds are
 * words ("Word 1 of 3") and the turns are each player's ("1 of 2 each").
 */
export function RoomProgress({
  roundNumber,
  rounds,
  turn,
  turnsPerPlayer,
  phase,
  turnTitle,
  note,
  msLeft,
  msTotal,
  secret,
}: RoomProgressProps) {
  const timed = phase === "drawing" || phase === "voting";
  const seconds = Math.ceil(msLeft / 1000);
  const fraction = msTotal > 0 ? Math.min(1, msLeft / msTotal) : 0;
  const label = note ?? (phase === "drawing" ? (turnTitle ?? "Drawing") : (phaseNames[phase] ?? ""));

  return (
    <div
      role="status"
      aria-label="Round progress"
      className="grid w-full gap-1.5 rounded-[14px_18px_16px_12px] bg-night-deep/95 px-3 py-2 text-sm shadow-[0_3px_0_var(--color-night)]"
    >
      {secret}
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-white/70">
        <span className="min-w-0 truncate font-display text-base text-white">{label}</span>{" "}
        {phase === "drawing" && !note && (
          <span className="shrink-0 text-xs">
            ({turn} of {turnsPerPlayer} each)
          </span>
        )}{" "}
        {timed && (
          <span className="shrink-0 font-display text-base text-white tabular-nums">
            <span aria-hidden="true">· </span>
            <span className="sr-only">Time left: </span>
            {phase === "voting" ? ClockUtils.format(msLeft) : `${seconds}s`}
          </span>
        )}{" "}
        <span className="ml-auto shrink-0 pl-2">
          Word <span className="font-display text-base text-white">{roundNumber}</span> of {rounds}
        </span>
      </p>
      {timed && (
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-night">
          <div
            className={`h-full origin-left rounded-full ${seconds <= 3 ? "bg-berry" : "bg-sun"}`}
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
      )}
    </div>
  );
}
