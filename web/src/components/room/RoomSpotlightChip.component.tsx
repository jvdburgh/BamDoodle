import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomSpotlightChipProps = {
  player: RoomPlayer;
  you?: boolean;
};

/** Sits in the canvas corner while a player's strokes are spotlit; tapping that player again shows everyone. */
export function RoomSpotlightChip({ player, you = false }: RoomSpotlightChipProps) {
  return (
    <div className="pointer-events-none flex items-center gap-2 rounded-full bg-night py-1 pr-1 pl-2 text-white shadow-[0_3px_0_var(--color-night-deep)]">
      <BrandScribble shape="magnifier" seed={player.avatarSeed} className="size-5" />
      <span className="pr-2 font-display">{you ? "Your lines" : `${player.name}’s lines`}</span>
    </div>
  );
}
