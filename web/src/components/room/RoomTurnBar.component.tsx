import type { TurnMode } from "@/protocol/generated/TurnMode";

type RoomTurnBarProps = {
  /** "Your turn" or "Juno’s turn". */
  title: string;
  /** Replaces the mode's hint, for example while watching someone else draw. */
  hint?: string;
  mode: TurnMode;
  msLeft: number;
  msTotal: number;
};

const hints: Record<TurnMode, string> = {
  oneStroke: "One stroke, then pass it on",
  timed: "Draw as much as you like",
};

/** Whose turn it is and how long they have, as a fuse that burns down. */
export function RoomTurnBar({ title, hint, mode, msLeft, msTotal }: RoomTurnBarProps) {
  const seconds = Math.ceil(msLeft / 1000);
  const fraction = msTotal > 0 ? Math.min(1, msLeft / msTotal) : 0;
  return (
    <div className="min-w-0">
      <p className="flex items-baseline justify-between gap-3">
        <span className="truncate font-display text-xl text-sun">{title}</span>
        <span className="font-display text-xl text-white tabular-nums">{seconds}s</span>
      </p>
      <div
        role="progressbar"
        aria-label={`${title}: time left`}
        aria-valuemin={0}
        aria-valuemax={Math.round(msTotal / 1000)}
        aria-valuenow={seconds}
        aria-valuetext={`${seconds} seconds left`}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-night-deep"
      >
        <div
          className={`h-full origin-left rounded-full ${seconds <= 3 ? "bg-berry" : "bg-sun"}`}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
      <p className="mt-1.5 text-sm text-white/65">{hint ?? hints[mode]}</p>
    </div>
  );
}
