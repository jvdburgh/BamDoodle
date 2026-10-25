import type { PhaseView } from "@/protocol/generated/PhaseView";

/** While someone draws or votes the music steps back, so the ticks and cues stay clear; it never stops for them. */
function ducked(phase: PhaseView["phase"]): boolean {
  return phase === "drawing" || phase === "voting";
}

const SILENT = 0.001;
const AUDIBLE_RMS = 0.02;
const WINDOW_S = 0.02;

/**
 * The span of a track to loop, in seconds: from its first sound to the end of its last audible stretch, leaving out
 * the silence before and the quiet tail after, so the loop has no gap where the track meets itself.
 */
function loopBounds(samples: Float32Array, sampleRate: number): { start: number; end: number } {
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]!) < SILENT) first++;
  if (first === samples.length) return { start: 0, end: samples.length / sampleRate };
  const window = Math.max(1, Math.round(sampleRate * WINDOW_S));
  let end = samples.length;
  for (let to = samples.length; to - window > first; to -= window) {
    let sum = 0;
    for (let i = to - window; i < to; i++) sum += samples[i]! * samples[i]!;
    if (Math.sqrt(sum / window) >= AUDIBLE_RMS) {
      end = to;
      break;
    }
  }
  return { start: first / sampleRate, end: end / sampleRate };
}

/**
 * Music plays unless switched off on a laptop or desktop (a mouse or trackpad), and stays off on a phone or tablet
 * (touch), so a table full of phones doesn't play it out of step.
 */
function onByDefault(matchMedia: (query: string) => { matches: boolean } = globalThis.matchMedia): boolean {
  return typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
}

export const MusicUtils = { ducked, loopBounds, onByDefault };
