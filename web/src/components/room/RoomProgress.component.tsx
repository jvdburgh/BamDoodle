import type { RoomPhase } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";

type RoomProgressProps = {
  roundNumber: number;
  rounds: number;
  /** Which of their turns the players are on, and how many each gets. */
  turn: number;
  turnsPerPlayer: number;
  phase: RoomPhase;
  /** "Your turn" or "Juno's turn" while drawing. */
  turnTitle?: string;
  /** Time left in the turn (drawing) or the vote (voting). */
  msLeft: number;
  msTotal: number;
};

const phaseNames: Partial<Record<RoomPhase, string>> = {
  lobby: "Waiting to start",
  voting: "Final vote",
  guessing: "The reveal",
  finished: "Results",
};

/** Where the round is, small and out of the way of the pens: round, turn, and the turn's or vote's countdown. */
export function RoomProgress({
  roundNumber,
  rounds,
  turn,
  turnsPerPlayer,
  phase,
  turnTitle,
  msLeft,
  msTotal,
}: RoomProgressProps) {
  const timed = phase === "drawing" || phase === "voting";
  const seconds = Math.ceil(msLeft / 1000);
  const fraction = msTotal > 0 ? Math.min(1, msLeft / msTotal) : 0;
  const label = phase === "drawing" ? (turnTitle ?? "Drawing") : (phaseNames[phase] ?? "");

  return (
    <div
      role="status"
      aria-label="Round progress"
      className="w-52 rounded-[14px_18px_16px_12px] bg-night-deep/95 px-3 py-2 text-sm shadow-[0_3px_0_var(--color-night)]"
    >
      <p className="flex justify-between gap-2 text-white/70">
        <span>
          Round <span className="font-display text-base text-white">{roundNumber}</span>/{rounds}
        </span>
        {phase === "drawing" && (
          <span>
            Turn <span className="font-display text-base text-white">{turn}</span> of {turnsPerPlayer}
          </span>
        )}
      </p>
      <p className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-lg text-sun">{label}</span>
        {timed && (
          <span className="font-display text-lg tabular-nums">
            <span className="sr-only">Time left: </span>
            {phase === "voting" ? ClockUtils.format(msLeft) : `${seconds}s`}
          </span>
        )}
      </p>
      {timed && (
        <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-night">
          <div
            className={`h-full origin-left rounded-full ${seconds <= 3 ? "bg-berry" : "bg-sun"}`}
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
      )}
    </div>
  );
}
