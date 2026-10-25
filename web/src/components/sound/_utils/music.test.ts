import { describe, expect, it } from "vitest";
import { MusicUtils } from "@/components/sound/_utils/music.utils";

describe("MusicUtils.ducked", () => {
  it("steps back while drawing or voting, full in the lobby and between rounds", () => {
    expect(MusicUtils.ducked("drawing")).toBe(true);
    expect(MusicUtils.ducked("voting")).toBe(true);
    expect(MusicUtils.ducked("lobby")).toBe(false);
    expect(MusicUtils.ducked("guessing")).toBe(false);
    expect(MusicUtils.ducked("finished")).toBe(false);
  });
});

describe("MusicUtils.loopBounds", () => {
  const rate = 1000;
  /** 1 s of silence, 5 s of music, a 1 s whisper of a tail, 1 s of silence. */
  const track = () => {
    const samples = new Float32Array(8 * rate);
    for (let i = 1 * rate; i < 6 * rate; i++) samples[i] = Math.sin(i) * 0.3;
    for (let i = 6 * rate; i < 7 * rate; i++) samples[i] = Math.sin(i) * 0.005;
    return samples;
  };

  it("loops from the first sound to the end of the last audible stretch", () => {
    const { start, end } = MusicUtils.loopBounds(track(), rate);
    expect(start).toBeCloseTo(1, 2);
    expect(end).toBeCloseTo(6, 1);
  });

  it("loops the whole track when it's all silence", () => {
    expect(MusicUtils.loopBounds(new Float32Array(rate), rate)).toEqual({ start: 0, end: 1 });
  });
});

describe("MusicUtils.onByDefault", () => {
  const pointer = (fine: boolean) => (query: string) => ({ matches: query === "(pointer: fine)" && fine });

  it("plays on a laptop or desktop and stays off on a phone", () => {
    expect(MusicUtils.onByDefault(pointer(true))).toBe(true);
    expect(MusicUtils.onByDefault(pointer(false))).toBe(false);
  });
});
