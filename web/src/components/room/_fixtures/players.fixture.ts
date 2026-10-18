import type { RoomPlayer } from "@/components/room/_types/room.types";

export const playersFixture: RoomPlayer[] = [
  { id: "pip", name: "Pip", avatarSeed: 12 },
  { id: "juno", name: "Juno", avatarSeed: 7 },
  { id: "mo", name: "Mo", avatarSeed: 23 },
  { id: "kiki", name: "Kiki", avatarSeed: 4 },
];

export const wordsFixture: { category: string; word: string }[] = [
  { category: "Animals", word: "Giraffe" },
  { category: "Places", word: "Lighthouse" },
  { category: "Food", word: "Pancake" },
  { category: "Nature", word: "Volcano" },
  { category: "Things", word: "Umbrella" },
];
