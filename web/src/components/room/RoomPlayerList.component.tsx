import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import { RoomSuspectButton } from "@/components/room/RoomSuspectButton.component";
import type { RoomOutcome, RoomPlayer } from "@/components/room/_types/room.types";

/**
 * What a tap on a face does: while drawing the hat marks someone as suspicious (changeable, public), in the final
 * vote it's your vote (changeable until the vote ends, secret). Left out on the host screen.
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
  /** Your final vote, shown as a badge. */
  yourVoteId?: number | null;
  /** Identity colour per player, when players have one (shade families). */
  colours?: Record<number, string>;
  /** On the bamboozler's own screen, their face wears the fedora. */
  youWearTheHat?: boolean;
  /** How many players suspect each player right now (public while drawing). */
  suspectedBy?: Record<number, number>;
  /** Who has voted (not for whom). */
  votedIds?: number[];
  /** After the vote: the bamboozler in the hat, who voted for whom, then the round's points and the totals. */
  outcome?: RoomOutcome;
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
 * spotlight them on the canvas), and the face as the hat: tap it to mark them as suspicious, or in the final vote to
 * vote for them. After the vote the cards carry the reveal and the round's points.
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
  outcome,
  layout = "grid",
}: RoomPlayerListProps) {
  /** The host screen is read from across the room: the results on its cards are bigger. */
  const big = layout === "row";
  const nameOf = (id: number) => (id === youId ? "you" : (players.find((player) => player.id === id)?.name ?? "?"));
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
          const isBamboozler = outcome?.bamboozlerId === player.id;
          const votedFor = outcome?.votes[player.id];
          const score = outcome?.scores?.[player.id];
          /** The reveal plays card by card: the bamboozler's hat first, then each vote, then the points. */
          const revealDelay = 900 + index * 150;
          const scoreDelay = revealDelay + 600;
          const ring =
            chosen || isBamboozler
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
                  {action && !you ? (
                    <RoomSuspectButton
                      name={player.name}
                      avatar={player.avatar}
                      color={colour}
                      kind={action.kind}
                      suspected={chosen}
                      onToggle={() => action.onChoose(action.kind === "suspect" && chosen ? null : player.id)}
                      ring={drawerRing}
                      className="size-12"
                    />
                  ) : (
                    <span className="relative size-12 shrink-0">
                      <AvatarDoodle
                        strokes={player.avatar}
                        color={colour}
                        backdrop={false}
                        hat={(you && youWearTheHat) || isBamboozler ? "worn" : undefined}
                        hatDelayMs={isBamboozler ? 600 : 0}
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
                {outcome && (
                  <p className={`mt-1 flex flex-wrap gap-1 ${big ? "text-lg" : "text-xs"}`}>
                    {isBamboozler && (
                      <span
                        style={{ animationDelay: "600ms" }}
                        className="animate-pop-in rounded-full bg-berry px-1.5 font-semibold text-night motion-reduce:animate-none"
                      >
                        bamboozler
                      </span>
                    )}
                    <span
                      style={{ animationDelay: `${revealDelay}ms` }}
                      className="animate-pop-in rounded-full bg-night px-1.5 text-white/85 motion-reduce:animate-none"
                    >
                      {votedFor === undefined ? (
                        "didn’t vote"
                      ) : (
                        <>
                          voted {nameOf(votedFor)}{" "}
                          {!isBamboozler && (
                            <>
                              <span aria-hidden="true" className={votedFor === outcome.bamboozlerId ? "text-sun" : ""}>
                                {votedFor === outcome.bamboozlerId ? "✓" : "✗"}
                              </span>
                              <span className="sr-only">
                                {votedFor === outcome.bamboozlerId ? ", right" : ", wrong"}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </p>
                )}
                {score && (
                  <p
                    style={{ animationDelay: `${scoreDelay}ms` }}
                    className="mt-1 flex animate-pop-in items-baseline gap-2 motion-reduce:animate-none"
                  >
                    <span
                      className={`font-display ${big ? "text-4xl" : "text-xl"} ${score.right ? "text-sun" : "text-white/50"}`}
                    >
                      +{score.points}
                    </span>
                    <span className={`text-white/70 ${big ? "text-lg" : "text-xs"}`}>
                      <span className={`font-display text-white ${big ? "text-3xl" : "text-base"}`}>
                        {outcome?.totals?.[player.id] ?? 0}
                      </span>{" "}
                      total
                    </span>
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
            </li>
          );
        })}
      </ol>
    </div>
  );
}
