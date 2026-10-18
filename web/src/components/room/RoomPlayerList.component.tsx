import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { CanvasSurface } from "@/components/canvas/CanvasBoard.component";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomPlayerListProps = {
  players: RoomPlayer[];
  drawing: Drawing;
  /** The player at this screen, marked "you"; null on a host screen or a shared device. */
  youId: string | null;
  activeId: string | null;
  nextId: string | null;
  spotlightId: string | null;
  onSpotlight: (playerId: string | null) => void;
  /** Hovering a player previews their spotlight without pinning it. */
  onPeek: (playerId: string | null) => void;
  /** Identity colour per player, when players have one (shade families). */
  colours?: Record<string, string>;
  surface?: CanvasSurface;
  /**
   * "auto": one row in narrow `room` containers (phones), a rail beside the canvas in wide ones.
   * "row": always one row, for the host screen.
   */
  layout?: "auto" | "row";
};

const columns: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/**
 * The turn order. Each player is a toggle that spotlights their strokes on the main canvas, with a live mini-map of
 * only their strokes.
 */
export function RoomPlayerList({
  players,
  drawing,
  youId,
  activeId,
  nextId,
  spotlightId,
  onSpotlight,
  onPeek,
  colours,
  surface,
  layout = "auto",
}: RoomPlayerListProps) {
  const rail = layout === "auto";
  return (
    <ol
      aria-label="Turn order"
      className={`grid gap-1.5 ${columns[players.length] ?? "grid-cols-6"} ${rail ? "@4xl/room:grid-cols-1 @4xl/room:gap-2.5" : "@4xl/room:gap-3"}`}
    >
      {players.map((player) => {
        const active = player.id === activeId;
        const spotlit = player.id === spotlightId;
        const status = active ? "Drawing now" : player.id === nextId ? "Up next" : null;
        const colour = colours?.[player.id];
        return (
          <li key={player.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={spotlit}
              onClick={() => {
                onPeek(null);
                onSpotlight(spotlit ? null : player.id);
              }}
              onPointerEnter={(event) => event.pointerType === "mouse" && onPeek(player.id)}
              onPointerLeave={() => onPeek(null)}
              className={`group relative flex w-full flex-col gap-1 rounded-[12px_16px_14px_10px] p-1 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white @md/room:gap-1.5 @md/room:p-1.5 ${
                rail
                  ? "@4xl/room:grid @4xl/room:grid-cols-[4.5rem_1fr] @4xl/room:items-center @4xl/room:gap-x-3 @4xl/room:p-2.5"
                  : "@4xl/room:p-2.5"
              } ${active ? "bg-night-soft" : "bg-night-deep/70 hover:bg-night-soft/70"} ${
                spotlit
                  ? "shadow-[inset_0_0_0_2px_var(--color-white)]"
                  : active
                    ? "shadow-[inset_0_0_0_2px_var(--color-sun)]"
                    : ""
              }`}
            >
              <span
                className={`flex min-w-0 items-center justify-center gap-1.5 @md/room:justify-start ${rail ? "@4xl/room:flex-col @4xl/room:items-start" : ""}`}
              >
                <span
                  className={`relative hidden shrink-0 @md/room:block ${rail ? "size-7 @4xl/room:size-11" : "size-9"}`}
                >
                  <AvatarDoodle seed={player.avatarSeed} color={colour} className="size-full" />
                  {active && (
                    <BrandScribble
                      shape="ring"
                      seed={player.avatarSeed}
                      weight={1.4}
                      className="absolute -inset-1 size-[calc(100%+0.5rem)] text-sun"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="sr-only">Spotlight </span>
                  <span
                    className={`block truncate font-display text-sm leading-tight @md/room:text-base @4xl/room:text-lg ${active ? "text-sun" : "text-white"}`}
                  >
                    {colour && (
                      <span
                        aria-hidden="true"
                        className="mr-1 inline-block size-2 rounded-full @md/room:hidden"
                        style={{ backgroundColor: colour }}
                      />
                    )}
                    {player.name}
                    {player.id === youId && (
                      <span className="ml-1 font-body text-xs text-white/65">
                        <span className="sr-only @md/room:not-sr-only">(you)</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`sr-only text-sm text-white/65 ${rail ? "@4xl/room:not-sr-only @4xl/room:block @4xl/room:h-5" : ""}`}
                  >
                    {status && <span className="sr-only">, </span>}
                    {status}
                  </span>
                </span>
              </span>
              <span className="relative">
                <CanvasMiniMap drawing={drawing} playerId={player.id} surface={surface} />
                <span
                  className={`absolute right-1 bottom-1 hidden size-7 place-items-center rounded-full bg-night text-white transition-opacity @4xl/room:grid ${
                    spotlit ? "opacity-100" : "opacity-0 group-hover:opacity-90 group-focus-visible:opacity-90"
                  }`}
                >
                  <BrandScribble shape="magnifier" seed={player.avatarSeed + 2} className="size-4" />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
