import { describe, expect, it } from "vitest";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import type { WordCategory } from "@/protocol/generated/WordCategory";

const all: WordCategory[] = [
  { language: "en", name: "Animals", adult: false, words: 2 },
  { language: "en", name: "Food", adult: false, words: 1 },
  { language: "en", name: "After dark", adult: true, words: 1 },
  { language: "nl", name: "Dieren", adult: false, words: 1 },
];

describe("LobbySetupUtils", () => {
  it("lists a language's categories", () => {
    expect(LobbySetupUtils.inLanguage(all, "nl").map((category) => category.name)).toEqual(["Dieren"]);
  });

  it("starts with every category of the language except the 18+ ones", () => {
    expect(LobbySetupUtils.defaults(all, "en")).toEqual(["Animals", "Food"]);
    expect(LobbySetupUtils.defaults(all, "nl")).toEqual(["Dieren"]);
  });
});
