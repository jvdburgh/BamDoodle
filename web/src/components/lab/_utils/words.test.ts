import { describe, expect, it } from "vitest";
import type { WordPack } from "@/components/lab/_types/lab.types";
import { WordsUtils } from "@/components/lab/_utils/words.utils";

const all: WordPack[] = [
  { language: "en", name: "Animals", adult: false, words: ["cat", "dog"] },
  { language: "en", name: "Food", adult: false, words: ["pizza"] },
  { language: "en", name: "After dark", adult: true, words: ["hangover"] },
  { language: "nl", name: "Dieren", adult: false, words: ["kat"] },
];

describe("WordsUtils", () => {
  it("lists the categories with their word counts, the way the server does", () => {
    expect(WordsUtils.catalogue(all)[0]).toEqual({ language: "en", name: "Animals", adult: false, words: 2 });
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
