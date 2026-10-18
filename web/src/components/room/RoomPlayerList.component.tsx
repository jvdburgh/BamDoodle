import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import { RoomSuspectButton } from "@/components/room/RoomSuspectButton.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

/**
 * What the card's button does: the hat marks someone as suspicious while drawing (changeable, public), a button picks
 * them in the final vote. Left out on the host screen and once you've voted.
 */
export type RoomPlayerAction = {
  kind: "suspect" | "vote";
  chosenId: number | null;
  onChoose: (id: number | null) => void;
};

type RoomPlayerListProps = {
  players: RoomPlayer[];
  drawing: Drawing;
  /** The player at this screen, marked "you"; null on the host screen. */
  youId: number | null;
  activeId: number | null;
  nextId: number | null;
  spotlightId: number | null;
  onSpotlight: (playerId: number | null) => void;
  /** Hovering a player previews their spotlight without pinning it. */
  onPeek: (playerId: number | null) => void;
  action?: RoomPlayerAction;
  /** Your locked final vote, shown as a badge. */
  yourVoteId?: number | null;
  /** Identity colour per player, when players have one (shade families). */
  colours?: Record<number, string>;
  /** On the bamboozler's own screen, their face wears the fedora. */
  youWearTheHat?: boolean;
  /** How many players suspect each player right now (public while drawing). */
  suspectedBy?: Record<number, number>;
  /** Who has locked a final vote (not for whom). */
  votedIds?: number[];
  /**
   * "grid": two or three columns of cards on a phone, and one column of wide cards in a laptop's `room` container;
   * "row": everyone in one row (host screen).
   */
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
 * spotlight them on the canvas), and the hat to mark them as suspicious or, in the final vote, a button to pick them.
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
  youWearTheHat = false,
  layout = "grid",
}: RoomPlayerListProps) {
  return (
    <div className="@container/players">
      <ol
        aria-label="Players"
        className={`grid gap-2 ${layout === "row" ? `grid-cols-3 ${rowColumns[players.length] ?? rowColumns[6]}` : "grid-cols-2 @xs/players:grid-cols-3 @5xl/room:grid-cols-1"}`}
      >
        {players.map((player, index) => {
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
              ? ""
              : active
                ? "shadow-[inset_0_0_0_2px_var(--color-sun)]"
                : "";
          const rail = layout === "grid";
          const drawerRing = active && (
            <BrandScribble
              shape="ring"
              seed={player.avatarSeed}
              weight={1.4}
              className="pointer-events-none absolute -inset-1 size-[calc(100%+0.5rem)] text-sun"
            />
          );
          return (
            <li
              key={player.id}
              onPointerEnter={(event) => event.pointerType === "mouse" && onPeek(player.id)}
              onPointerLeave={() => onPeek(null)}
              style={{ animationDelay: `${index * 60}ms` }}
              className={`relative flex min-w-0 animate-card-in flex-col gap-1.5 rounded-[12px_16px_14px_10px] p-1.5 transition-colors motion-reduce:animate-none ${
                rail
                  ? "@5xl/room:grid @5xl/room:grid-cols-[minmax(0,1fr)_5.5rem] @5xl/room:items-center @5xl/room:gap-x-2.5 @5xl/room:gap-y-1 @5xl/room:p-2"
                  : ""
              } ${active ? "bg-night-soft" : "bg-night-deep/70"} ${ring}`}
            >
              {spotlit && <BrandSketchyFrame bold className="text-white" />}
              <div className={`min-w-0 ${rail ? "@5xl/room:col-start-1 @5xl/room:row-start-1" : ""}`}>
                <div className="flex min-w-0 items-center gap-2">
                  {action?.kind === "suspect" && !you ? (
                    <RoomSuspectButton
                      name={player.name}
                      avatar={player.avatar}
                      color={colour}
                      suspected={chosen}
                      onToggle={() => action.onChoose(chosen ? null : player.id)}
                      ring={drawerRing}
                      className="size-8"
                    />
                  ) : (
                    <span className="relative size-8 shrink-0">
                      <AvatarDoodle
                        strokes={player.avatar}
                        color={colour}
                        hat={(you && youWearTheHat) || (action?.kind === "vote" && chosen) ? "worn" : undefined}
                        className="size-full"
                      />
                      {drawerRing}
                    </span>
                  )}
                  <span className={`min-w-0 truncate font-display leading-tight ${active ? "text-sun" : "text-white"}`}>
                    {player.name}
                    {you && <span className="ml-1 font-body text-xs text-white/65">(you)</span>}
                    {status && <span className="sr-only">, {status}</span>}
                  </span>
                </div>
                {(votedIds.includes(player.id) || suspects > 0 || yourVoteId === player.id) && (
                  <p className="mt-1 flex flex-wrap gap-1 text-xs">
                    {yourVoteId === player.id && (
                      <span className="rounded-full bg-berry px-1.5 font-semibold text-night">your vote</span>
                    )}
                    {votedIds.includes(player.id) && (
                      <span className="animate-pop-in rounded-full bg-sun px-1.5 text-night motion-reduce:animate-none">
                        voted
                      </span>
                    )}
                    {suspects > 0 && (
                      <span
                        key={suspects}
                        className="animate-pop-in rounded-full bg-night px-1.5 text-white/85 motion-reduce:animate-none"
                      >
                        suspected by {suspects}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-pressed={spotlit}
                aria-label={`Spotlight ${player.name}`}
                onClick={() => {
                  onPeek(null);
                  onSpotlight(spotlit ? null : player.id);
                }}
                className={`group relative block rounded-[6px_8px_7px_5px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  rail ? "@5xl/room:col-start-2 @5xl/room:row-span-2 @5xl/room:row-start-1" : ""
                }`}
              >
                <CanvasMiniMap drawing={drawing} playerId={player.id} />
                <span
                  className={`absolute right-1 bottom-1 grid size-6 place-items-center rounded-full bg-night text-white transition-opacity ${
                    spotlit ? "opacity-100" : "opacity-0 group-hover:opacity-90 group-focus-visible:opacity-90"
                  }`}
                >
                  <BrandScribble shape="magnifier" seed={player.avatarSeed + 2} className="size-3.5" />
                </span>
              </button>

              {action?.kind === "vote" && !you && (
                <button
                  type="button"
                  aria-pressed={chosen}
                  aria-label={`Pick ${player.name}`}
                  onClick={() => action.onChoose(chosen ? null : player.id)}
                  className={`min-h-9 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    rail ? "@5xl/room:col-start-1 @5xl/room:row-start-2 @5xl/room:self-end" : ""
                  } ${chosen ? "bg-berry text-night" : "bg-night text-white/90 hover:bg-night-soft"}`}
                >
                  Pick{chosen && <span aria-hidden="true"> ✓</span>}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
