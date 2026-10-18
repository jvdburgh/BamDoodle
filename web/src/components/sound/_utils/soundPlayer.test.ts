import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeSource = { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; startedAt: number | null };

/** A small stand-in for the Web Audio graph: a clock, gains that accept automation, sources that record start/stop. */
function fakeAudio() {
  const sources: FakeSource[] = [];
  const param = () => ({
    value: 0,
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: (next: unknown) => next, disconnect: vi.fn() });
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    sampleRate = 44_100;
    destination = {};
    resume = () => Promise.resolve();
    createGain = () => ({ ...node(), gain: param() });
    createBufferSource = () => {
      const source: FakeSource & Record<string, unknown> = {
        ...node(),
        buffer: null,
        onended: null,
        startedAt: null,
        start: vi.fn((at: number) => {
          source.startedAt = at;
        }),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    };
    decodeAudioData = () => Promise.resolve({ duration: 60 });
  }
  return { sources, FakeAudioContext };
}

describe("SoundPlayer music", () => {
  let audio: ReturnType<typeof fakeAudio>;
  let unlock: () => void;
  let fetchMusic: ReturnType<typeof vi.fn>;

  const load = async () => {
    vi.resetModules();
    const { SoundPlayer } = await import("@/components/sound/_utils/soundPlayer.utils");
    return SoundPlayer;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    audio = fakeAudio();
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      AudioContext: audio.FakeAudioContext,
      addEventListener: (type: string, listener: () => void) => {
        if (type === "pointerup") unlock = listener;
      },
      removeEventListener: () => {},
      setTimeout,
      clearTimeout,
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
    vi.stubGlobal("AudioContext", audio.FakeAudioContext);
    fetchMusic = vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    vi.stubGlobal("fetch", fetchMusic);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for the first tap, then starts music that was wanted before it", async () => {
    const player = await load();
    player.setMusicWanted(true, true);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(0);
    unlock();
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(1);
  });

  it("stays silent on a phone until switched on", async () => {
    const player = await load();
    unlock();
    player.setMusicWanted(true, false);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(0);
    player.setMusicOn(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(1);
  });

  it("fades out and stops when no longer wanted, but keeps the loop if wanted again during the fade", async () => {
    const player = await load();
    unlock();
    player.setMusicWanted(true, true);
    await vi.advanceTimersByTimeAsync(10);
    const [first] = audio.sources;

    player.setMusicWanted(false, true);
    await vi.advanceTimersByTimeAsync(1000);
    player.setMusicWanted(true, true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(first?.stop).not.toHaveBeenCalled();
    expect(audio.sources).toHaveLength(1);

    player.setMusicWanted(false, true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(first?.stop).toHaveBeenCalled();
  });

  it("never starts a loop when switched off while the track loads", async () => {
    const player = await load();
    unlock();
    player.setMusicWanted(true, true);
    player.setMusicOn(false);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(0);
  });

  it("starts the next pass where this one starts fading out", async () => {
    const player = await load();
    unlock();
    player.setMusicWanted(true, true);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(57_000);
    expect(audio.sources).toHaveLength(2);
    expect(audio.sources[1]?.startedAt).toBeCloseTo(0.05 + 60 - 3);
  });

  it("tries the track again after a failed load", async () => {
    fetchMusic.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    const player = await load();
    unlock();
    player.setMusicWanted(true, true);
    await vi.advanceTimersByTimeAsync(10);
    expect(audio.sources).toHaveLength(0);
    player.setMusicWanted(false, true);
    player.setMusicWanted(true, true);
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMusic).toHaveBeenCalledTimes(2);
    expect(audio.sources).toHaveLength(1);
  });
});
