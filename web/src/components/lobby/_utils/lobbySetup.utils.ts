import type { Language } from "@/protocol/generated/Language";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { WordCategory } from "@/protocol/generated/WordCategory";
import type { WordGroup } from "@/protocol/generated/WordGroup";

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
  rounds: [3, 4, 5, 10],
};

/** Same as the server: `TIMED_TURNS_PER_PLAYER` in limits.rs. */
const timedTurnsPerPlayer = 2;

const groupNames: Record<WordGroup, string> = {
  everyday: "Everyday",
  culture: "Culture",
  dutch: "Dutch",
  world: "World",
  media: "Film & TV",
  trivia: "Trivia",
  tech: "Tech",
  logos: "Logos",
  adults: "18+",
};

type CategoryGroup<T> = { group: WordGroup; name: string; categories: T[] };

/** Categories under their word pack's name, in the order the server lists them (everyday first, 18+ last). */
function grouped<T extends Pick<WordCategory, "group">>(categories: T[]): CategoryGroup<T>[] {
  const groups: CategoryGroup<T>[] = [];
  for (const category of categories) {
    const last = groups.at(-1);
    if (last?.group === category.group) last.categories.push(category);
    else groups.push({ group: category.group, name: groupNames[category.group], categories: [category] });
  }
  return groups;
}

/** The setup's estimate is for a typical table. */
const TYPICAL_PLAYERS = 5;
/** One line, one stroke: a few seconds, well under the 15-second limit. */
const SECONDS_PER_LINE = 6;
/** Around each drawing: the round's start card, the vote (30 s at most), the guess (20 s) and the results. */
const SECONDS_AROUND_A_ROUND = 60;

/** How long a game with these settings takes, roughly: "About 17 minutes with 5 players". */
function estimate(settings: RoomSettings): string {
  const drawing =
    settings.mode === "timed"
      ? TYPICAL_PLAYERS * timedTurnsPerPlayer * settings.turnSeconds
      : TYPICAL_PLAYERS * settings.turnsPerPlayer * SECONDS_PER_LINE;
  const minutes = Math.max(1, Math.round((settings.rounds * (drawing + SECONDS_AROUND_A_ROUND)) / 60));
  const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const length =
    hours === 0
      ? plural(minutes, "minute")
      : [plural(hours, "hour"), minutes % 60 ? plural(minutes % 60, "minute") : ""].filter(Boolean).join(" ");
  return `About ${length} with ${TYPICAL_PLAYERS} players`;
}

export const LobbySetupUtils = { choices, timedTurnsPerPlayer, inLanguage, defaults, grouped, estimate };
