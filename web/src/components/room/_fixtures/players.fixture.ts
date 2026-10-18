import type { RoomPlayer, RoomSetup } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

/** Six seats, the most a room is meant for; take the first three to six. */
export const playersFixture: RoomPlayer[] = [
  { id: "pip", name: "Pip", avatarSeed: 12 },
  { id: "juno", name: "Juno", avatarSeed: 7 },
  { id: "mo", name: "Mo", avatarSeed: 23 },
  { id: "kiki", name: "Kiki", avatarSeed: 4 },
  { id: "rafa", name: "Rafa", avatarSeed: 31 },
  { id: "tess", name: "Tess", avatarSeed: 18 },
];

/** Four letters from the server's code alphabet (no vowels, so no accidental words). */
export const roomCodeFixture = "BKZW";

export type WordCard = { category: string; word: string };

/** A few cards for stories; the app deals them from the chosen categories (words.fixture.ts). */
export const wordsFixture: WordCard[] = [
  { category: "Animals", word: "Giraffe" },
  { category: "Places", word: "Lighthouse" },
  { category: "Food", word: "Pancake" },
  { category: "Nature", word: "Volcano" },
  { category: "Things", word: "Umbrella" },
];

export const setupFixture: RoomSetup = { ...RoundUtils.DEFAULT_SETUP, categories: ["Animals", "Food", "Places"] };
