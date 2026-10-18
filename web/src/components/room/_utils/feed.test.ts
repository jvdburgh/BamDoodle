import { describe, expect, it } from "vitest";
import { roundFixture } from "@/components/room/_fixtures/roomState.fixture";
import { FeedUtils } from "@/components/room/_utils/feed.utils";

const noor = { name: "Noor", you: false };
const you = { name: "Juno", you: true };

describe("FeedUtils", () => {
  it("announces a first suspicion, a change of mind and doubt", () => {
    expect(FeedUtils.suspicion(noor, "Jip", null)).toBe("Noor thinks Jip is sketchy");
    expect(FeedUtils.suspicion(noor, "Max", "Jip")).toBe("Noor now suspects Max");
    expect(FeedUtils.suspicion(noor, null, "Max")).toBe("Noor isn’t sure anymore");
  });

  it("talks to you about your own suspicions", () => {
    expect(FeedUtils.suspicion(you, "Jip", null)).toBe("You think Jip is sketchy");
    expect(FeedUtils.suspicion(you, "Max", "Jip")).toBe("You now suspect Max");
  });

  it("says who has voted, never for whom", () => {
    expect(FeedUtils.voted(noor)).toBe("Noor has voted");
    expect(FeedUtils.voted(you)).toBe("You voted");
  });
});

describe("FeedUtils.between", () => {
  it("turns changed suspicions and new votes into lines", () => {
    const before = roundFixture({
      suspicions: [
        { playerId: 1, suspectId: 3 },
        { playerId: 2, suspectId: 4 },
      ],
    });
    const after = roundFixture({
      suspicions: [
        { playerId: 1, suspectId: 4 },
        { playerId: 2, suspectId: 4 },
      ],
      voted: [5],
    });
    expect(FeedUtils.between(before, after, 100, 7)).toEqual([
      { id: 7, at: 100, voterId: 1, kind: "suspect", suspectId: 4, beforeId: 3 },
      { id: 8, at: 100, voterId: 5, kind: "voted" },
    ]);
  });

  it("notices a suspicion taken back", () => {
    const before = roundFixture({ suspicions: [{ playerId: 1, suspectId: 3 }] });
    expect(FeedUtils.between(before, roundFixture(), 0, 1)).toEqual([
      { id: 1, at: 0, voterId: 1, kind: "suspect", suspectId: null, beforeId: 3 },
    ]);
  });
});
