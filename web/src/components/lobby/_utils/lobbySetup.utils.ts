import type { Language } from "@/protocol/generated/Language";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type Category = Pick<WordCategory, "language" | "name" | "adult">;

const inLanguage = <T extends Category>(all: T[], language: Language): T[] =>
  all.filter((category) => category.language === language);

/** What switching language resets to: every category of that language except the 18+ ones. */
function defaults(all: Category[], language: Language): string[] {
  return inLanguage(all, language)
    .filter((category) => !category.adult)
    .map((category) => category.name);
}

/** What the host can pick; the server allows the same (`limits.rs`), defaults in docs/game-rules.md. */
const choices = {
  turnsPerPlayer: [1, 2, 3, 4, 5],
  turnSeconds: [10, 20, 30, 60],
  rounds: [3, 5, 10],
};

export const LobbySetupUtils = { choices, inLanguage, defaults };
