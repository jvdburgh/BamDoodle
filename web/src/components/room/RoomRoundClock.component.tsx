import { ClockUtils } from "@/components/room/_utils/clock.utils";

type RoomRoundClockProps = {
  msLeft: number;
};

const HURRY_MS = 10_000;

/** Time left in the round. Turns berry for the last ten seconds. */
export function RoomRoundClock({ msLeft }: RoomRoundClockProps) {
  const hurry = msLeft > 0 && msLeft <= HURRY_MS;
  return (
    <p
      className={`font-display text-4xl leading-none tabular-nums transition-colors @4xl/room:text-5xl ${hurry ? "text-berry" : "text-white"}`}
    >
      <span className="sr-only">Round time left: </span>
      {ClockUtils.format(msLeft)}
    </p>
  );
}
