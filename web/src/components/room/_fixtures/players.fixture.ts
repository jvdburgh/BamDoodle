import type { RoomPlayer } from "@/components/room/_types/room.types";

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

export const wordsFixture: { category: string; word: string }[] = [
  { category: "Animals", word: "Giraffe" },
  { category: "Places", word: "Lighthouse" },
  { category: "Food", word: "Pancake" },
  { category: "Nature", word: "Volcano" },
  { category: "Things", word: "Umbrella" },
];
