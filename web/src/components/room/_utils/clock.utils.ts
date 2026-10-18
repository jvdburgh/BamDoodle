import type { Countdown } from "@/protocol/roomState.utils";

/** Milliseconds as a countdown, rounded up so "0:00" only shows when time is really up. */
function format(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Time left on a countdown at `now`, never below zero; 0 without one. */
function left(countdown: Countdown | null, now: number): number {
  return countdown ? Math.min(countdown.totalMs, Math.max(0, countdown.endsAt - now)) : 0;
}

export const ClockUtils = { format, left };
