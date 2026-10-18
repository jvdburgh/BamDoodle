import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";

/**
 * What the card's button does: mark someone as sketchy while drawing (changeable, public), or pick them in the final
 * vote. Left out on the host screen and once you've voted.
 */
export type RoomPlayerAction = {
  kind: "suspect" | "vote";
  chosenId: string | null;
  onChoose: (id: string | null) => void;
};

type RoomPlayerListProps = {
  players: RoomPlayer[];
  drawing: Drawing;
  /** The player at this screen, marked "you"; null on the host screen. */
  youId: string | null;
  activeId: string | null;
  nextId: string | null;
  spotlightId: string | null;
  onSpotlight: (playerId: string | null) => void;
  /** Hovering a player previews their spotlight without pinning it. */
  onPeek: (playerId: string | null) => void;
  action?: RoomPlayerAction;
  /** Your locked final vote, shown as a badge. */
  yourVoteId?: string | null;
  /** Identity colour per player, when players have one (shade families). */
  colours?: Record<string, string>;
  /** How many players suspect each player right now (public while drawing). */
  suspectedBy?: Record<string, number>;
  /** Who has locked a final vote (not for whom). */
  votedIds?: string[];
  /** "grid": two or three columns, depending on the space; "row": everyone in one row (host screen). */
  layout?: "grid" | "row";
};

/** Full class names, so Tailwind sees them. */
const rowColumns: Record<number, string> = {
  1: "@3xl/players:grid-cols-1",
  2: "@3xl/players:grid-cols-2",
  3: "@3xl/players:grid-cols-3",
  4: "@3xl/players:grid-cols-4",
  5: "@3xl/players:grid-cols-5",
  6: "@3xl/players:grid-cols-6",
};

/**
 * The turn order and who drew what: one card per player with a live mini-map of only their strokes (click it to
 * spotlight them on the canvas), and the button to mark them as sketchy or, in the final vote, to pick them.
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
  action,
  yourVoteId = null,
  colours,
  suspectedBy = {},
  votedIds = [],
  layout = "grid",
}: RoomPlayerListProps) {
  return (
    <div className="@container/players">
      <ol
        aria-label="Players"
        className={`grid gap-2 ${layout === "row" ? `grid-cols-3 ${rowColumns[players.length] ?? rowColumns[6]}` : "grid-cols-2 @xs/players:grid-cols-3"}`}
      >
        {players.map((player) => {
          const you = player.id === youId;
          const active = player.id === activeId;
          const spotlit = player.id === spotlightId;
          const chosen = action?.chosenId === player.id;
          const status = active ? "Drawing now" : player.id === nextId ? "Up next" : null;
          const colour = colours?.[player.id];
          const suspects = suspectedBy[player.id] ?? 0;
          const ring = chosen
            ? "shadow-[inset_0_0_0_2px_var(--color-berry)]"
            : spotlit
              ? "shadow-[inset_0_0_0_2px_var(--color-white)]"
              : active
                ? "shadow-[inset_0_0_0_2px_var(--color-sun)]"
                : "";
          return (
            <li
              key={player.id}
              className={`flex min-w-0 flex-col gap-1.5 rounded-[12px_16px_14px_10px] p-1.5 transition-colors ${active ? "bg-night-soft" : "bg-night-deep/70"} ${ring}`}
            >
              <button
                type="button"
                aria-pressed={spotlit}
                onClick={() => {
                  onPeek(null);
                  onSpotlight(spotlit ? null : player.id);
                }}
                onPointerEnter={(event) => event.pointerType === "mouse" && onPeek(player.id)}
                onPointerLeave={() => onPeek(null)}
                className="group flex flex-col gap-1 rounded-[10px_12px_11px_9px] text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="relative size-6 shrink-0">
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
                  <span className={`min-w-0 truncate font-display leading-tight ${active ? "text-sun" : "text-white"}`}>
                    <span className="sr-only">Spotlight </span>
                    {player.name}
                    {you && <span className="ml-1 font-body text-xs text-white/65">(you)</span>}
                    {status && <span className="sr-only">, {status}</span>}
                  </span>
                </span>
                <span className="relative">
                  <CanvasMiniMap drawing={drawing} playerId={player.id} />
                  <span
                    className={`absolute right-1 bottom-1 grid size-6 place-items-center rounded-full bg-night text-white transition-opacity ${
                      spotlit ? "opacity-100" : "opacity-0 group-hover:opacity-90 group-focus-visible:opacity-90"
                    }`}
                  >
                    <BrandScribble shape="magnifier" seed={player.avatarSeed + 2} className="size-3.5" />
                  </span>
                </span>
              </button>

              {(votedIds.includes(player.id) || suspects > 0 || yourVoteId === player.id) && (
                <span className="flex flex-wrap gap-1 text-xs">
                  {yourVoteId === player.id && (
                    <span className="rounded-full bg-berry px-1.5 font-semibold text-night">your vote</span>
                  )}
                  {votedIds.includes(player.id) && <span className="rounded-full bg-sun px-1.5 text-night">voted</span>}
                  {suspects > 0 && (
                    <span className="rounded-full bg-night px-1.5 text-white/85">suspected by {suspects}</span>
                  )}
                </span>
              )}

              {action && !you && (
                <button
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => action.onChoose(chosen ? null : player.id)}
                  className={`min-h-9 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    chosen ? "bg-berry text-night" : "bg-night text-white/90 hover:bg-night-soft"
                  }`}
                >
                  {action.kind === "suspect"
                    ? chosen
                      ? "Marked sketchy"
                      : "Mark as sketchy"
                    : chosen
                      ? "Picked"
                      : "Pick"}
                  <span className="sr-only"> ({player.name})</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
