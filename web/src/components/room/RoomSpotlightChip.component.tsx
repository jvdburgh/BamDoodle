import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomSpotlightChipProps = {
  player: RoomPlayer;
  you?: boolean;
  /** While the spotlight is pinned (not a hover peek): the chip is the button back to everyone's lines. */
  onClear?: () => void;
};

/** Sits in the canvas corner while a player's strokes are spotlit, so it's clear why the other lines are faded. */
export function RoomSpotlightChip({ player, you = false, onClear }: RoomSpotlightChipProps) {
  const label = (
    <>
      <BrandScribble shape="magnifier" seed={player.avatarSeed} className="size-5" />
      <span className="font-display">{you ? "Your lines" : `${player.name}’s lines`}</span>
    </>
  );
  const chip =
    "flex items-center gap-2 rounded-full bg-night py-1 pr-3 pl-2 text-white shadow-[0_3px_0_var(--color-night-deep)]";
  if (!onClear) return <div className={`pointer-events-none ${chip}`}>{label}</div>;
  return (
    <button
      type="button"
      onClick={onClear}
      className={`${chip} min-h-9 hover:bg-night-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white`}
    >
      {label}
      <span className="text-sm text-white/75">
        · Show everyone <span aria-hidden="true">✕</span>
      </span>
    </button>
  );
}
