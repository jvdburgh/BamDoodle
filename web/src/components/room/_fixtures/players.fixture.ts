import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";

const seat = (id: number, name: string, avatarSeed: number): RoomPlayer => ({
  id,
  name,
  avatarSeed,
  avatar: AvatarUtils.face(avatarSeed),
  connected: true,
  ready: true,
});

/** Six seats, the most a room is meant for; take the first three to six. Everyone kept their starting face. */
export const playersFixture: RoomPlayer[] = [
  seat(1, "Pip", 12),
  seat(2, "Juno", 7),
  seat(3, "Mo", 23),
  seat(4, "Kiki", 4),
  seat(5, "Rafa", 31),
  seat(6, "Tess", 18),
];

/** Two more seats, for a full room of eight (the server's `MAX_PLAYERS`). */
export const morePlayersFixture: RoomPlayer[] = [seat(7, "Noor", 9), seat(8, "Sam", 27)];

/** Four letters from the server's code alphabet (no vowels, so no accidental words). */
export const roomCodeFixture = "BKZW";
