import { describe, expect, it } from "vitest";
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
    expect(FeedUtils.voted(you)).toBe("You locked in your vote");
  });
});
