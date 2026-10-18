import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomPenTagProps = {
  player: RoomPlayer;
  /** Identity colour, when players have one (shade families). */
  color?: string;
};

/** Rides on the pen tip while someone draws, so every screen sees whose line is growing. */
export function RoomPenTag({ player, color }: RoomPenTagProps) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-night py-0.5 pr-3 pl-0.5 font-display text-sm whitespace-nowrap text-white shadow-[0_2px_0_var(--color-sun)]">
      <AvatarDoodle seed={player.avatarSeed} color={color} className="size-6" />
      {player.name}
    </span>
  );
}
