import { describe, expect, it } from "vitest";
import type { WordCategory } from "@/components/room/_types/room.types";
import { WordsUtils } from "@/components/room/_utils/words.utils";

const all: WordCategory[] = [
  { language: "en", name: "Animals", adult: false, words: ["cat", "dog"] },
  { language: "en", name: "Food", adult: false, words: ["pizza"] },
  { language: "en", name: "After dark", adult: true, words: ["hangover"] },
  { language: "nl", name: "Dieren", adult: false, words: ["kat"] },
];

describe("WordsUtils", () => {
  it("starts with every category of the language except the 18+ ones", () => {
    expect(WordsUtils.defaults(all, "en")).toEqual(["Animals", "Food"]);
    expect(WordsUtils.defaults(all, "nl")).toEqual(["Dieren"]);
  });

  it("drops names from another language and falls back to the defaults when nothing is left", () => {
    expect(WordsUtils.valid(all, "en", ["Food", "Dieren"])).toEqual(["Food"]);
    expect(WordsUtils.valid(all, "nl", ["Food"])).toEqual(["Dieren"]);
    expect(WordsUtils.valid(all, "en", ["After dark"])).toEqual(["After dark"]);
  });

  it("deals the words of the chosen categories only, shuffled the same way for a seed", () => {
    const deck = WordsUtils.deck(all, "en", ["Animals", "After dark"], 3);
    expect(deck.map((card) => card.word).sort()).toEqual(["cat", "dog", "hangover"]);
    expect(deck).toEqual(WordsUtils.deck(all, "en", ["Animals", "After dark"], 3));
    expect(deck.find((card) => card.word === "hangover")?.category).toBe("After dark");
  });
});
