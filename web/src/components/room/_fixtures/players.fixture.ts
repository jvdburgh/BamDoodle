import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import type { RoomPlayer, RoomSetup } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

const seat = (id: string, name: string, avatarSeed: number): RoomPlayer => ({
  id,
  name,
  avatarSeed,
  avatar: AvatarUtils.face(avatarSeed),
});

/** Six seats, the most a room is meant for; take the first three to six. Everyone kept their starting face. */
export const playersFixture: RoomPlayer[] = [
  seat("pip", "Pip", 12),
  seat("juno", "Juno", 7),
  seat("mo", "Mo", 23),
  seat("kiki", "Kiki", 4),
  seat("rafa", "Rafa", 31),
  seat("tess", "Tess", 18),
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
