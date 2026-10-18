import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomSpotlightChipProps = {
  player: RoomPlayer;
  you?: boolean;
  /** Offered only for a pinned spotlight; a hover peek clears itself. */
  onClear?: () => void;
};

/** Sits in the canvas corner while a player's strokes are spotlit. */
export function RoomSpotlightChip({ player, you = false, onClear }: RoomSpotlightChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-night py-1 pr-1 pl-2 text-white shadow-[0_3px_0_var(--color-night-deep)]">
      <BrandScribble shape="magnifier" seed={player.avatarSeed} className="size-5" />
      <span className="pr-2 font-display">{you ? "Your lines" : `${player.name}’s lines`}</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-night-soft px-3 py-1 text-sm hover:bg-iris/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Show all <span className="text-white/60 pointer-coarse:hidden">(Esc)</span>
        </button>
      )}
    </div>
  );
}
