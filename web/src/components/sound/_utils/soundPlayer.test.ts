import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SoundCue } from "@/components/sound/_utils/soundCues.utils";

const RATE = 1000;

/** 1 s of silence, then 52 s of music, then silence: like the real track, which ends with a quiet tail. */
function trackSamples() {
  const samples = new Float32Array(60 * RATE);
  for (let i = 1 * RATE; i < 53 * RATE; i++) samples[i] = Math.sin(i) * 0.3;
  return samples;
}

type FakeParam = { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
type FakeSource = {
  buffer: unknown;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  /** The node this source plays into: the music's own gain, for the music. */
  output: unknown;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

/** A small stand-in for the Web Audio graph: a clock, gains that record automation, sources that record start/stop. */
function fakeAudio() {
  const sources: FakeSource[] = [];
  const gains: FakeParam[] = [];
  const contexts: { state: string; resume: ReturnType<typeof vi.fn> }[] = [];
  const track = { duration: 60, sampleRate: RATE, getChannelData: () => trackSamples() };
  const param = (): FakeParam & Record<string, unknown> => ({
    value: 0,
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: (next: unknown) => next, disconnect: vi.fn() });
  class FakeAudioContext {
    constructor() {
      contexts.push(this);
    }
    state = "running";
    currentTime = 0;
    sampleRate = 44_100;
    destination = {};
    resume = vi.fn(() => {
      this.state = "running";
      return Promise.resolve();
    });
    createGain = () => {
      const gain = param();
      gains.push(gain);
      return { ...node(), gain };
    };
    createOscillator = () => ({ ...node(), type: "", frequency: param(), start: vi.fn(), stop: vi.fn() });
    createBiquadFilter = () => ({ ...node(), type: "", frequency: param(), Q: param() });
    createBuffer = (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
    createBufferSource = () => {
      const source: FakeSource & Record<string, unknown> = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        output: null,
        disconnect: vi.fn(),
        connect: (next: unknown) => {
          source.output = next;
          return next;
        },
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    };
    decodeAudioData = () => Promise.resolve(track);
  }
  const musicSources = () => sources.filter((source) => source.buffer === track);
  return { FakeAudioContext, musicSources, gains, contexts };
}

describe("SoundPlayer music", () => {
  let audio: ReturnType<typeof fakeAudio>;
  let tap: () => void;
  let becomeVisible: () => void;
  let fetchMusic: ReturnType<typeof vi.fn>;

  const load = async () => {
    vi.resetModules();
    const { SoundPlayer } = await import("@/components/sound/_utils/soundPlayer.utils");
    return SoundPlayer;
  };
  /** The level the music's own output gain was last sent to. */
  const musicLevel = () => {
    const output = audio.musicSources()[0]?.output as { gain: FakeParam } | undefined;
    return output?.gain.setTargetAtTime.mock.lastCall?.[0] as number | undefined;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    audio = fakeAudio();
    const store = new Map<string, string>();
    const Context = audio.FakeAudioContext;
    vi.stubGlobal("window", {
      AudioContext: Context,
      addEventListener: (type: string, listener: () => void) => {
        if (type === "pointerup") tap = listener;
        if (type === "visibilitychange") becomeVisible = listener;
      },
      setTimeout,
      clearTimeout,
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
    vi.stubGlobal("AudioContext", Context);
    vi.stubGlobal("document", { visibilityState: "visible" });
    fetchMusic = vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    vi.stubGlobal("fetch", fetchMusic);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const screen = { playing: true, ducked: false, byDefault: true };

  it("waits for the first tap, then loops the track's audible span with no gap", async () => {
    const player = await load();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.musicSources()).toHaveLength(0);
    tap();
    await vi.advanceTimersByTimeAsync(10);
    const [music] = audio.musicSources();
    expect(music?.loop).toBe(true);
    expect(music?.loopStart).toBeCloseTo(1, 1);
    expect(music?.loopEnd).toBeCloseTo(53, 1);
    expect(music?.start).toHaveBeenCalledWith(expect.any(Number), music?.loopStart);
  });

  it("fetches the track before the first tap, so the tap only has to decode it", async () => {
    const player = await load();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMusic).toHaveBeenCalledTimes(1);
    expect(audio.musicSources()).toHaveLength(0);
    tap();
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMusic).toHaveBeenCalledTimes(1);
    expect(audio.musicSources()).toHaveLength(1);
  });

  it("starts at its volume straight away: no fade-in that sounds like nothing happened", async () => {
    const player = await load();
    player.setMusic(screen);
    tap();
    await vi.advanceTimersByTimeAsync(10);
    const output = audio.musicSources()[0]?.output as { gain: FakeParam } | undefined;
    expect(output?.gain.value).toBeGreaterThan(0);
  });

  it("keeps playing and looping while sound effects play", async () => {
    const player = await load();
    tap();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    const level = musicLevel();
    const cues: Record<SoundCue, true> = {
      start: true,
      turn: true,
      yourTurn: true,
      tick: true,
      voteTick: true,
      timeUp: true,
      reveal: true,
      fanfare: true,
      suspect: true,
      pick: true,
      vote: true,
      scribble: true,
    };
    for (const cue of Object.keys(cues) as SoundCue[]) player.play(cue);
    await vi.advanceTimersByTimeAsync(120_000);

    const [music] = audio.musicSources();
    expect(audio.musicSources()).toHaveLength(1);
    expect(music?.stop).not.toHaveBeenCalled();
    expect(music?.loop).toBe(true);
    expect(musicLevel()).toBe(level);
    expect(level).toBeGreaterThan(0);
  });

  it("steps back while someone draws, without stopping, and comes back after", async () => {
    const player = await load();
    tap();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    const full = musicLevel()!;
    player.setMusic({ ...screen, ducked: true });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(musicLevel()).toBeCloseTo(full * 0.35);
    player.setMusic(screen);
    expect(musicLevel()).toBe(full);
    expect(audio.musicSources()).toHaveLength(1);
    expect(audio.musicSources()[0]?.stop).not.toHaveBeenCalled();
  });

  it("plays on from the start page into the room: the screen that closes hands the music back, no restart", async () => {
    const player = await load();
    tap();
    const start = player.claimMusic({ ducked: false, byDefault: true });
    await vi.advanceTimersByTimeAsync(10);
    const full = musicLevel()!;
    const room = player.claimMusic({ ducked: true, byDefault: true });
    expect(musicLevel()).toBeCloseTo(full * 0.35);
    // The start page changing its mind underneath doesn't take the music back from the room.
    start.update({ ducked: false, byDefault: true });
    expect(musicLevel()).toBeCloseTo(full * 0.35);
    room.update({ ducked: false, byDefault: true });
    expect(musicLevel()).toBe(full);
    room.update({ ducked: true, byDefault: true });

    room.release();
    await vi.advanceTimersByTimeAsync(5000);
    expect(musicLevel()).toBe(full);
    expect(audio.musicSources()).toHaveLength(1);
    expect(audio.musicSources()[0]?.stop).not.toHaveBeenCalled();

    start.release();
    await vi.advanceTimersByTimeAsync(5000);
    expect(audio.musicSources()[0]?.stop).toHaveBeenCalled();
  });

  it("stays silent on a phone until switched on", async () => {
    const player = await load();
    tap();
    player.setMusic({ ...screen, byDefault: false });
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.musicSources()).toHaveLength(0);
    player.setMusicOn(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.musicSources()).toHaveLength(1);
  });

  it("fades out and stops when switched off, but keeps the same loop if switched on during the fade", async () => {
    const player = await load();
    tap();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    const [music] = audio.musicSources();

    player.setMusicOn(false);
    await vi.advanceTimersByTimeAsync(1000);
    player.setMusicOn(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(music?.stop).not.toHaveBeenCalled();
    expect(audio.musicSources()).toHaveLength(1);

    player.setMusicOn(false);
    await vi.advanceTimersByTimeAsync(3000);
    expect(music?.stop).toHaveBeenCalled();
  });

  it("never starts when switched off while the track loads", async () => {
    const player = await load();
    tap();
    player.setMusic(screen);
    player.setMusicOn(false);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.musicSources()).toHaveLength(0);
  });

  it("resumes audio the browser suspended, on the next tap", async () => {
    const player = await load();
    tap();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    const [context] = audio.contexts;
    context!.state = "suspended";
    context!.resume.mockClear();
    tap();
    expect(context!.resume).toHaveBeenCalled();
    expect(context!.state).toBe("running");
  });

  it("resumes suspended audio when the page is shown again, and shrugs off a refusal", async () => {
    const player = await load();
    tap();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    const [context] = audio.contexts;
    context!.state = "suspended";
    context!.resume.mockImplementationOnce(() => Promise.reject(new Error("needs a gesture")));
    becomeVisible();
    await vi.advanceTimersByTimeAsync(10);
    expect(context!.resume).toHaveBeenCalled();
    tap();
    expect(context!.state).toBe("running");
  });

  it("tries the track again after a failed load", async () => {
    fetchMusic.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    const player = await load();
    tap();
    player.setMusic(screen);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.musicSources()).toHaveLength(0);
    player.setMusic({ ...screen, ducked: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMusic).toHaveBeenCalledTimes(2);
    expect(audio.musicSources()).toHaveLength(1);
  });
});
