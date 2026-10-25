import { ClockUtils } from "@/components/room/_utils/clock.utils";

type RoomRoundClockProps = {
  msLeft: number;
  /** The host screen's vote: the biggest thing on screen. */
  big?: boolean;
};

const HURRY_MS = 10_000;

/** Time left in the round. Turns berry for the last ten seconds. */
export function RoomRoundClock({ msLeft, big = false }: RoomRoundClockProps) {
  const hurry = msLeft > 0 && msLeft <= HURRY_MS;
  return (
    <p
      className={`font-display leading-none tabular-nums transition-colors ${big ? "text-8xl @7xl/room:text-9xl" : "text-4xl @4xl/room:text-5xl"} ${hurry ? "text-berry" : "text-white"}`}
    >
      <span className="sr-only">Round time left: </span>
      {ClockUtils.format(msLeft)}
    </p>
  );
}
