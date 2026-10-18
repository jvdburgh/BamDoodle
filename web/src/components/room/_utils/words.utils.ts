import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import type { WordCard } from "@/components/room/_fixtures/players.fixture";
import type { WordPack, WordLanguage } from "@/components/room/_types/room.types";

const inLanguage = (all: WordPack[], language: WordLanguage) =>
  all.filter((category) => category.language === language);

/** What a new room starts with, and what switching language resets to: every category except the 18+ ones. */
function defaults(all: WordPack[], language: WordLanguage): string[] {
  return inLanguage(all, language)
    .filter((category) => !category.adult)
    .map((category) => category.name);
}

/** Keeps the names that exist in this language; none left means the defaults, since at least one must be in play. */
function valid(all: WordPack[], language: WordLanguage, names: string[]): string[] {
  const known = new Set(inLanguage(all, language).map((category) => category.name));
  const kept = names.filter((name) => known.has(name));
  return kept.length > 0 ? kept : defaults(all, language);
}

/** Every word from the chosen categories, shuffled the same way for the same seed. */
function deck(all: WordPack[], language: WordLanguage, names: string[], seed: number): WordCard[] {
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

export const WordsUtils = { inLanguage, defaults, valid, deck };
