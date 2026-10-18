import type { PhaseView } from "@/protocol/generated/PhaseView";

/** Music plays in the lobby and between rounds; it gives way while someone draws or votes (the pencil, the ticks). */
function wanted(phase: PhaseView["phase"]): boolean {
  return phase !== "drawing" && phase !== "voting";
}

/**
 * One pass of the loop, starting at `at` (seconds on the audio clock): it fades in over `overlap`, fades out over the
 * last `overlap`, and the next pass starts as this one starts fading out, so the seam is a crossfade.
 */
function pass(at: number, duration: number, overlap: number) {
  return {
    at,
    fadedIn: at + overlap,
    fadeOut: at + duration - overlap,
    end: at + duration,
    next: at + duration - overlap,
  };
}

export const MusicUtils = { wanted, pass };
