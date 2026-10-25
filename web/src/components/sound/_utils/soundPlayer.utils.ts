import { MusicUtils } from "@/components/sound/_utils/music.utils";
import type { SoundCue } from "@/components/sound/_utils/soundCues.utils";

/**
 * Every sound effect is synthesised here with the Web Audio API: no effect files, so nothing to license or download.
 * The one file is the background music (web/public/sounds, see its NOTICE), with its own toggle.
 * The audio context only starts after the first tap or key press (browsers block sound before that), and the
 * mute choice is remembered per device.
 */

const STORAGE_KEY = "bamdoodle.muted";
const MUSIC_KEY = "bamdoodle.music";
const MASTER_GAIN = 0.22;
const MUSIC_SRC = "/sounds/quirky-detective.m4a";
const MUSIC_GAIN = 0.14;
/** The music's level while someone draws or votes, as a share of its full level. */
const MUSIC_DUCKED = 0.35;

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
  voteTick: [
    { frequency: 950, at: 0, length: 0.04, type: "square", gain: 0.35 },
    { frequency: 1900, at: 0.045, length: 0.03, type: "square", gain: 0.2 },
  ],
  reveal: [
    { frequency: 196, at: 0, length: 0.08, type: "square", gain: 0.3 },
    { frequency: 220, at: 0.09, length: 0.08, type: "square", gain: 0.3 },
    { frequency: 247, at: 0.18, length: 0.08, type: "square", gain: 0.35 },
    { frequency: 262, at: 0.27, length: 0.08, type: "square", gain: 0.4 },
    { frequency: 784, at: 0.4, length: 0.5 },
  ],
  fanfare: [
    { frequency: 523, at: 0, length: 0.12 },
    { frequency: 659, at: 0.12, length: 0.12 },
    { frequency: 784, at: 0.24, length: 0.12 },
    { frequency: 1047, at: 0.36, length: 0.3 },
    { frequency: 784, at: 0.62, length: 0.1 },
    { frequency: 1047, at: 0.74, length: 0.6 },
  ],
  suspect: [
    { frequency: 880, at: 0, length: 0.05, type: "sine", gain: 0.3 },
    { frequency: 660, at: 0.05, length: 0.07, type: "sine", gain: 0.25 },
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
let musicChoice = readMusicChoice();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readMusicChoice(): boolean | null {
  try {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(MUSIC_KEY);
    return stored === null ? null : stored === "1";
  } catch {
    return null;
  }
}

/**
 * Starts audio inside a user gesture, and resumes it whenever the browser suspended it (a locked phone, a call, a
 * backgrounded tab): `pointerup` counts as a gesture on touch screens where `pointerdown` doesn't, and iOS only
 * resumes a context from within the gesture itself, so these listeners stay for the whole visit.
 */
function unlock() {
  if (!("AudioContext" in window)) return;
  if (!context) {
    context = new AudioContext();
    updateMusic();
  }
  // Refused outside a gesture (iOS after an interruption): the next tap tries again.
  if (context.state !== "running") context.resume().then(updateMusic, () => {});
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerup", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("visibilitychange", () => {
    if (context && document.visibilityState === "visible") unlock();
  });
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

/**
 * Background music: one source looping the track's audible span natively (no timers, so no gap and no stop when a
 * hidden tab throttles them). It plays while a screen with music is open and it's switched on, steps back while
 * someone draws or votes, and never stops for a sound effect: effects play through their own nodes. Off by default on
 * a player's phone, so a table of phones doesn't play it out of step; on by default on the host screen. The choice is
 * remembered per device.
 */
let musicByDefault = false;
let musicScreen = false;
let musicDucked = false;
let musicBytes: Promise<ArrayBuffer> | null = null;
let musicTrack: Promise<{ buffer: AudioBuffer; start: number; end: number } | null> | null = null;
let music: { output: GainNode; source: AudioBufferSourceNode; stopTimer: number } | null = null;

const musicOn = () => musicChoice ?? musicByDefault;

/** The track's bytes, fetched as soon as a screen has music: the first tap then only decodes, no wait to hear it. */
function fetchMusic() {
  musicBytes ??= fetch(MUSIC_SRC).then((response) => response.arrayBuffer());
  return musicBytes;
}

function loadMusic(audio: AudioContext) {
  musicTrack ??= fetchMusic()
    .then((data) => audio.decodeAudioData(data))
    .then((buffer) => ({ buffer, ...MusicUtils.loopBounds(buffer.getChannelData(0), buffer.sampleRate) }))
    .catch(() => {
      musicBytes = null;
      musicTrack = null;
      return null;
    });
  return musicTrack;
}

function stopMusic() {
  if (!music) return;
  window.clearTimeout(music.stopTimer);
  music.source.stop();
  music.output.disconnect();
  music = null;
}

function updateMusic() {
  const audio = context;
  if (!audio || audio.state !== "running") return;
  const level = musicOn() && musicScreen ? MUSIC_GAIN * (musicDucked ? MUSIC_DUCKED : 1) : 0;
  if (music) {
    window.clearTimeout(music.stopTimer);
    music.output.gain.setTargetAtTime(level, audio.currentTime, level > 0 ? 0.6 : 0.4);
    if (level === 0) music.stopTimer = window.setTimeout(stopMusic, 3000);
    return;
  }
  if (level === 0) return;
  void loadMusic(audio).then((track) => {
    if (!track || music || !musicOn() || !musicScreen) return;
    const output = audio.createGain();
    // At its volume straight away: a fade-in from silence sounds like the switch didn't work.
    output.gain.value = musicDucked ? MUSIC_GAIN * MUSIC_DUCKED : MUSIC_GAIN;
    output.connect(audio.destination);
    const source = audio.createBufferSource();
    source.buffer = track.buffer;
    source.loop = true;
    source.loopStart = track.start;
    source.loopEnd = track.end;
    source.connect(output);
    source.start(audio.currentTime + 0.05, track.start);
    music = { output, source, stopTimer: 0 };
    updateMusic();
  });
}

/** Whether this screen has music, whether it steps back right now, and whether it plays unless switched off. */
function setMusic({ playing, ducked, byDefault }: { playing: boolean; ducked: boolean; byDefault: boolean }) {
  const changedDefault = musicByDefault !== byDefault;
  musicScreen = playing;
  musicDucked = ducked;
  musicByDefault = byDefault;
  if (changedDefault) for (const listener of listeners) listener();
  if (playing && musicOn()) void fetchMusic().catch(() => (musicBytes = null));
  updateMusic();
}

type MusicScreen = { ducked: boolean; byDefault: boolean };
/** Screens with music, the latest last: the start page, then the room inside it. */
const musicScreens: MusicScreen[] = [];

/**
 * This screen has music until the returned function is called. The latest screen sets it; when it goes, the one
 * before it takes over without restarting the loop (the room hands back to the start page).
 */
function claimMusic(screen: MusicScreen): () => void {
  const claim = { ...screen };
  musicScreens.push(claim);
  setMusic({ playing: true, ...claim });
  return () => {
    musicScreens.splice(musicScreens.indexOf(claim), 1);
    const previous = musicScreens.at(-1);
    setMusic(previous ? { playing: true, ...previous } : { playing: false, ducked: false, byDefault: false });
  };
}

function setMusicOn(next: boolean) {
  musicChoice = next;
  try {
    window.localStorage.setItem(MUSIC_KEY, next ? "1" : "0");
  } catch {
    // Not remembered, but on or off for now.
  }
  for (const listener of listeners) listener();
  updateMusic();
}

/** Forget this device's music choice, back to the screen's default. */
function clearMusicChoice() {
  musicChoice = null;
  try {
    window.localStorage.removeItem(MUSIC_KEY);
  } catch {
    // Nothing remembered to forget.
  }
  for (const listener of listeners) listener();
  updateMusic();
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

export const SoundPlayer = {
  play,
  isMuted: () => muted,
  setMuted,
  isMusicOn: musicOn,
  setMusicOn,
  clearMusicChoice,
  setMusic,
  claimMusic,
  subscribe,
};
