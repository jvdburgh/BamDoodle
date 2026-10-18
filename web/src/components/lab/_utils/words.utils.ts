import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import type { WordCard, WordPack } from "@/components/lab/_types/lab.types";
import type { Language } from "@/protocol/generated/Language";
import type { WordCategory } from "@/protocol/generated/WordCategory";

const { inLanguage, defaults } = LobbySetupUtils;

/** Keeps the names that exist in this language; none left means the defaults, since at least one must be in play. */
function valid(all: WordPack[], language: Language, names: string[]): string[] {
  const known = new Set(inLanguage(all, language).map((category) => category.name));
  const kept = names.filter((name) => known.has(name));
  return kept.length > 0 ? kept : defaults(all, language);
}

/** Every word from the chosen categories, shuffled the same way for the same seed. */
function deck(all: WordPack[], language: Language, names: string[], seed: number): WordCard[] {
  const chosen = new Set(names);
  const cards = inLanguage(all, language)
    .filter((category) => chosen.has(category.name))
    .flatMap((category) => category.words.map((word) => ({ category: category.name, word })));
  const rand = ScribbleUtils.random(seed);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j] as WordCard, cards[i] as WordCard];
  }
  return cards;
}

/** The playground's categories as the server lists them: with a word count instead of the words. */
const catalogue = (all: WordPack[]): WordCategory[] => all.map((pack) => ({ ...pack, words: pack.words.length }));

export const WordsUtils = { valid, deck, catalogue };
