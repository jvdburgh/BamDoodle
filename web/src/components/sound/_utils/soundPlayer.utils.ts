import type { SoundCue } from "@/components/sound/_utils/soundCues.utils";

/**
 * Every sound is synthesised here with the Web Audio API: no audio files, so nothing to license or download.
 * The audio context only starts after the first tap or key press (browsers block sound before that), and the
 * mute choice is remembered per device.
 */

const STORAGE_KEY = "bamdoodle.muted";
const MASTER_GAIN = 0.22;

type Note = { frequency: number; at: number; length: number; type?: OscillatorType; gain?: number };

const notes: Record<Exclude<SoundCue, "scribble">, Note[]> = {
  start: [
    { frequency: 523, at: 0, length: 0.09 },
    { frequency: 659, at: 0.08, length: 0.09 },
    { frequency: 784, at: 0.16, length: 0.16 },
  ],
  turn: [{ frequency: 660, at: 0, length: 0.07, gain: 0.35 }],
  yourTurn: [
    { frequency: 587, at: 0, length: 0.1 },
    { frequency: 880, at: 0.1, length: 0.18 },
  ],
  tick: [{ frequency: 1250, at: 0, length: 0.03, type: "square", gain: 0.25 }],
  roundTick: [
    { frequency: 950, at: 0, length: 0.04, type: "square", gain: 0.35 },
    { frequency: 1900, at: 0.045, length: 0.03, type: "square", gain: 0.2 },
  ],
  timeUp: [
    { frequency: 784, at: 0, length: 0.14 },
    { frequency: 659, at: 0.15, length: 0.14 },
    { frequency: 523, at: 0.3, length: 0.14 },
    { frequency: 392, at: 0.45, length: 0.45 },
  ],
  pick: [{ frequency: 1480, at: 0, length: 0.035, type: "sine", gain: 0.25 }],
  vote: [
    { frequency: 1047, at: 0, length: 0.06 },
    { frequency: 1319, at: 0.05, length: 0.06 },
    { frequency: 1568, at: 0.1, length: 0.06 },
    { frequency: 2093, at: 0.15, length: 0.14 },
  ],
};

let context: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Starts (or resumes) audio inside a user gesture. `pointerup` counts as one on touch screens where `pointerdown`
 * doesn't, and iOS only resumes a context from within the gesture itself; keep listening until it's running.
 */
function unlock() {
  if (!("AudioContext" in window)) return;
  context ??= new AudioContext();
  if (context.state !== "running") void context.resume();
  if (context.state === "running") {
    window.removeEventListener("pointerup", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerup", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

function tone(audio: AudioContext, output: AudioNode, { frequency, at, length, type = "triangle", gain = 1 }: Note) {
  const start = audio.currentTime + at;
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(envelope).connect(output);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

/** A short pencil scratch: filtered noise with a quick swell. */
function scratch(audio: AudioContext, output: AudioNode) {
  const length = 0.12;
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * length), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2600;
  filter.Q.value = 0.8;
  const envelope = audio.createGain();
  const start = audio.currentTime;
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.35, start + 0.03);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter).connect(envelope).connect(output);
  source.start(start);
}

function play(cue: SoundCue) {
  if (muted || !context || context.state !== "running") return;
  const master = context.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(context.destination);
  if (cue === "scribble") scratch(context, master);
  else for (const note of notes[cue]) tone(context, master, note);
}

function setMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Not remembered, but still muted for now.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const SoundPlayer = { play, isMuted: () => muted, setMuted, subscribe };
