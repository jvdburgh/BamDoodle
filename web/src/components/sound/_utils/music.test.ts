import { describe, expect, it } from "vitest";
import { MusicUtils } from "@/components/sound/_utils/music.utils";

describe("MusicUtils.wanted", () => {
  it("plays in the lobby and between rounds, not while drawing or voting", () => {
    expect(MusicUtils.wanted("lobby")).toBe(true);
    expect(MusicUtils.wanted("guessing")).toBe(true);
    expect(MusicUtils.wanted("finished")).toBe(true);
    expect(MusicUtils.wanted("drawing")).toBe(false);
    expect(MusicUtils.wanted("voting")).toBe(false);
  });
});

describe("MusicUtils.pass", () => {
  it("crossfades: the next pass starts as this one starts fading out", () => {
    expect(MusicUtils.pass(10, 60, 3)).toEqual({ at: 10, fadedIn: 13, fadeOut: 67, end: 70, next: 67 });
  });
});
