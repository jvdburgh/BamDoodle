import type { RoomSetup, WordCard } from "@/components/lab/_types/lab.types";
import { RoundUtils } from "@/components/lab/_utils/round.utils";

/** A few cards for stories; the lab deals them from the chosen categories (words.fixture.ts). */
export const wordsFixture: WordCard[] = [
  { category: "Animals", word: "Giraffe" },
  { category: "Places", word: "Lighthouse" },
  { category: "Food", word: "Pancake" },
  { category: "Nature", word: "Volcano" },
  { category: "Things", word: "Umbrella" },
];

export const setupFixture: RoomSetup = { ...RoundUtils.DEFAULT_SETUP, categories: ["Animals", "Food", "Places"] };
