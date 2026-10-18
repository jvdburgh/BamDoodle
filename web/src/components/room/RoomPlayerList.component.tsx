import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomPlayerListProps = {
  players: RoomPlayer[];
  drawing: Drawing;
  /** The player at this screen, marked "you"; null when everyone shares one device. */
  youId: string | null;
  activeId: string | null;
  nextId: string | null;
  spotlightId: string | null;
  onSpotlight: (playerId: string | null) => void;
  /** Hovering a player previews their spotlight without pinning it. */
  onPeek: (playerId: string | null) => void;
};

/** The turn order, top to bottom. Each player is a toggle that spotlights their strokes on the main canvas. */
export function RoomPlayerList({
  players,
  drawing,
  youId,
  activeId,
  nextId,
  spotlightId,
  onSpotlight,
  onPeek,
}: RoomPlayerListProps) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1 lg:gap-3" aria-label="Turn order">
      {players.map((player) => {
        const active = player.id === activeId;
        const spotlit = player.id === spotlightId;
        const status = active ? "Drawing now" : player.id === nextId ? "Up next" : null;
        return (
          <li key={player.id}>
            <button
              type="button"
              aria-pressed={spotlit}
              onClick={() => {
                onPeek(null);
                onSpotlight(spotlit ? null : player.id);
              }}
              onPointerEnter={(event) => event.pointerType === "mouse" && onPeek(player.id)}
              onPointerLeave={() => onPeek(null)}
              className={`group relative grid w-full grid-cols-1 items-center gap-x-3 gap-y-2 lg:grid-cols-[4.75rem_1fr] rounded-[14px_18px_16px_12px] p-2.5 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun lg:p-3 ${
                active ? "bg-night-soft" : "bg-night-deep/70 hover:bg-night-soft/70"
              } ${spotlit ? "shadow-[inset_0_0_0_2px_var(--color-white)]" : active ? "shadow-[inset_0_0_0_2px_var(--color-sun)]" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
                <span className="relative size-11 shrink-0 lg:size-12">
                  <AvatarDoodle seed={player.avatarSeed} className="size-full" />
                  {active && (
                    <BrandScribble
                      shape="ring"
                      seed={player.avatarSeed}
                      className="absolute -inset-1.5 size-[calc(100%+0.75rem)] text-sun"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="sr-only">Spotlight </span>
                  <span
                    className={`block truncate font-display text-lg leading-tight font-bold ${active ? "text-sun" : "text-white"}`}
                  >
                    {player.name}
                    {player.id === youId && (
                      <span className="ml-1.5 font-body text-sm font-normal text-white/65">(you)</span>
                    )}
                  </span>
                  <span className="block h-5 text-sm text-white/65">
                    {status && <span className="sr-only">, </span>}
                    {status}
                  </span>
                </span>
              </span>
              <span className="relative">
                <CanvasMiniMap drawing={drawing} playerId={player.id} />
                <span
                  className={`absolute right-1 bottom-1 grid size-8 place-items-center rounded-full bg-night text-white transition-opacity ${
                    spotlit ? "opacity-100" : "opacity-0 group-hover:opacity-90 group-focus-visible:opacity-90"
                  }`}
                >
                  <BrandScribble shape="magnifier" seed={player.avatarSeed + 2} className="size-5" />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
