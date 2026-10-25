import { describe, expect, it } from "vitest";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { WordCategory } from "@/protocol/generated/WordCategory";

const all: WordCategory[] = [
  { language: "en", name: "Animals", group: "everyday", adult: false, words: 2 },
  { language: "en", name: "Food", group: "everyday", adult: false, words: 1 },
  { language: "en", name: "Films", group: "media", adult: false, words: 1 },
  { language: "en", name: "After dark", group: "adults", adult: true, words: 1 },
  { language: "nl", name: "Dieren", group: "everyday", adult: false, words: 1 },
];

const settings: RoomSettings = {
  mode: "timed",
  turnsPerPlayer: 3,
  turnSeconds: 20,
  rounds: 4,
  language: "en",
  categories: ["Animals"],
};

describe("LobbySetupUtils", () => {
  it("lists a language's categories", () => {
    expect(LobbySetupUtils.inLanguage(all, "nl").map((category) => category.name)).toEqual(["Dieren"]);
  });

  it("starts with every category of the language except the 18+ ones", () => {
    expect(LobbySetupUtils.defaults(all, "en")).toEqual(["Animals", "Food", "Films"]);
    expect(LobbySetupUtils.defaults(all, "nl")).toEqual(["Dieren"]);
  });

  it("groups categories by their word pack, in the server's order, with a name for each group", () => {
    const groups = LobbySetupUtils.grouped(LobbySetupUtils.inLanguage(all, "en"));
    expect(groups.map(({ name, categories }) => [name, categories.map((category) => category.name)])).toEqual([
      ["Everyday", ["Animals", "Food"]],
      ["Film & TV", ["Films"]],
      ["18+", ["After dark"]],
    ]);
  });

  it("estimates a game for five players: the drawing, plus the vote, the guess and the results each round", () => {
    // Timed: 5 players × 2 turns × 20 s = 200 s of drawing, plus about a minute around it, 4 rounds: 17 minutes.
    expect(LobbySetupUtils.estimate(settings)).toBe("About 17 minutes with 5 players");
    // One stroke: 5 players × 3 lines × about 6 s = 90 s, plus a minute, 3 rounds: 7.5, so 8 minutes.
    expect(LobbySetupUtils.estimate({ ...settings, mode: "oneStroke", rounds: 3 })).toBe(
      "About 8 minutes with 5 players",
    );
    expect(LobbySetupUtils.estimate({ ...settings, turnSeconds: 60, rounds: 10 })).toBe(
      "About 1 hour 50 minutes with 5 players",
    );
    expect(LobbySetupUtils.estimate({ ...settings, mode: "oneStroke", turnsPerPlayer: 1, rounds: 1 })).toBe(
      "About 2 minutes with 5 players",
    );
  });
});
