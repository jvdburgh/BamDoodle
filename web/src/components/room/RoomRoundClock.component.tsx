import { RoundUtils } from "@/components/room/_utils/round.utils";

type RoomRoundClockProps = {
  msLeft: number;
};

const HURRY_MS = 10_000;

/** Time left in the round. Turns berry for the last ten seconds. */
export function RoomRoundClock({ msLeft }: RoomRoundClockProps) {
  const hurry = msLeft > 0 && msLeft <= HURRY_MS;
  return (
    <p className="flex flex-col items-end leading-none">
      <span
        className={`font-display text-4xl font-extrabold tabular-nums transition-colors sm:text-5xl ${hurry ? "text-berry" : "text-white"}`}
      >
        <span className="sr-only">Round time left: </span>
        {RoundUtils.formatClock(msLeft)}
      </span>
      <span className="mt-1 text-sm text-white/60" aria-hidden="true">
        left in round
      </span>
    </p>
  );
}
