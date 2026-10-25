import { useEffect } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { CanvasMiniMap } from "@/components/canvas/CanvasMiniMap.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import { RoomSuspectButton } from "@/components/room/RoomSuspectButton.component";
import type { RoomOutcome, RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";

/**
 * What a tap on a face does: while drawing the hat says you suspect them (changeable, public), in the final
 * vote it's your vote (changeable until the vote ends, secret). Left out on the host screen.
 */
export type RoomPlayerAction = {
  kind: "suspect" | "vote";
  /** Your suspicion while drawing; in the vote, only a vote you actually cast. */
  chosenId: number | null;
  /** In the vote: who you suspected while drawing, shown as a hint (it counts if you don't vote), never as a vote. */
  suspectedId?: number | null;
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
  /** On the bamboozler's own screen, their face wears the fedora. */
  youWearTheHat?: boolean;
  /** Who suspects each player right now (public while drawing): suspect → the players who marked them. */
  suspectedBy?: Record<number, number[]>;
  /** Who has voted (not for whom). */
  votedIds?: number[];
  /** After the vote: the bamboozler in the hat, who voted for whom, then the round's points and the totals. */
  outcome?: RoomOutcome;
  /** In the lobby: who's still drawing their face, and no mini-maps (nothing's drawn yet). */
  lobby?: boolean;
  /**
   * "grid": two columns of cards on a phone (so names fit), three on a tablet, and one column of wide cards in a
   * laptop's `room` container;
   * "row": big centred tiles, face over name (the host screen's lobby);
   * "column": one column of big cards beside the canvas, read from across the room (the host screen during a round);
   * "sheet": small cards (the face and name, the mini-map as a thumbnail beside the Vote button) in two columns,
   * three when there's room, four on a phone on its side or a laptop (the vote sheet).
   */
  layout?: "grid" | "row" | "column" | "sheet";
};

/**
 * The turn order and who drew what: one card per player with a live mini-map of only their strokes (click it to
 * spotlight them on the canvas), and the face as the hat: tap it to suspect them, or in the final vote to
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
  suspectedBy = {},
  votedIds = [],
  youWearTheHat = false,
  outcome,
  lobby = false,
  layout = "grid",
}: RoomPlayerListProps) {
  /** The host screen is read from across the room: the results on its cards are bigger. */
  const tile = layout === "row";
  const column = layout === "column";
  const big = tile || column;
  /** Seven or eight in a column on a laptop: a size smaller, so every card still fits. */
  const crowded = column && players.length > 6;
  const pill = crowded ? "text-lg @2xl/players:text-xl" : big ? "text-xl" : "text-xs";
  const face = tile ? "size-24" : column ? "row-span-2 size-14 @2xl/players:size-20" : "size-12";
  // Cards that go away under the mouse (the vote sheet closing) never hear it leave: end the peek with them.
  useEffect(() => () => onPeek(null), [onPeek]);
  return (
    <div className={`@container/players ${column ? "lg:h-full" : ""}`}>
      <ol
        aria-label="Players"
        // A column shares the height out: every card fits on one screen, up to a size that still looks like a card.
        style={column ? { maxHeight: `${players.length * 10}rem` } : undefined}
        className={
          tile
            ? "flex flex-wrap justify-center gap-3 lg:flex-nowrap"
            : column
              ? "grid gap-2 lg:h-full lg:auto-rows-[minmax(0,1fr)]"
              : layout === "sheet"
                ? "grid grid-cols-2 gap-2 @lg/players:grid-cols-3 @3xl/players:grid-cols-4 sideways:grid-cols-4"
                : "grid grid-cols-2 gap-2 @lg/players:grid-cols-3 @5xl/room:grid-cols-1"
        }
      >
        {players.map((player, index) => {
          const you = player.id === youId;
          const active = player.id === activeId;
          const spotlit = player.id === spotlightId;
          const chosen = action?.chosenId === player.id;
          const status = active ? "Drawing now" : player.id === nextId ? "Up next" : null;
          const suspects = suspectedBy[player.id] ?? [];
          const isBamboozler = outcome?.bamboozlerId === player.id;
          const votedFor = outcome?.votes[player.id];
          const score = outcome?.scores?.[player.id];
          /** The reveal plays card by card: the bamboozler's hat first, then each vote, then the points. */
          const revealDelay = 900 + index * 150;
          const scoreDelay = revealDelay + 600;
          const ring =
            chosen && action?.kind === "vote"
              ? "shadow-[inset_0_0_0_2px_var(--color-sun)]"
              : chosen || isBamboozler
                ? "shadow-[inset_0_0_0_2px_var(--color-berry)]"
                : spotlit
                  ? ""
                  : active
                    ? "shadow-[inset_0_0_0_2px_var(--color-sun)]"
                    : you
                      ? "shadow-[inset_0_0_0_2px_var(--color-iris)]"
                      : "";
          const rail = layout === "grid";
          const sheet = layout === "sheet";
          const voted = votedIds.includes(player.id);
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
              className={`relative min-w-0 animate-card-in rounded-[12px_16px_14px_10px] transition-colors motion-reduce:animate-none ${
                tile
                  ? "flex w-44 flex-col items-center p-4 text-center lg:w-auto lg:max-w-44 lg:flex-1"
                  : column
                    ? "grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden p-2 lg:grid-rows-[minmax(0,1fr)]"
                    : sheet
                      ? "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-1.5 p-1.5"
                      : "flex flex-col gap-1.5 p-1.5"
              } ${
                rail
                  ? "@5xl/room:grid @5xl/room:grid-cols-[minmax(0,1fr)_5.5rem] @5xl/room:items-center @5xl/room:gap-x-2.5 @5xl/room:gap-y-1 @5xl/room:p-2"
                  : ""
              } ${active ? "bg-night-soft" : you ? "bg-iris/20" : "bg-night-deep/70"} ${ring}`}
            >
              {spotlit && <BrandSketchyFrame bold className="text-white" />}
              {/* On a sheet card its parts sit in the card's grid: the header across, the thumbnail beside the button. */}
              <div
                className={`min-w-0 ${rail ? "@5xl/room:col-start-1 @5xl/room:row-start-1" : ""} ${
                  column ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3" : ""
                } ${sheet ? "contents" : ""}`}
              >
                <div
                  className={`peer min-w-0 items-center ${tile ? "flex flex-col gap-3" : column ? "contents" : "flex gap-2"} ${sheet ? "col-span-2" : ""}`}
                >
                  {action && !you ? (
                    <RoomSuspectButton
                      name={player.name}
                      avatar={player.avatar}
                      kind={action.kind}
                      suspected={chosen}
                      onToggle={() => action.onChoose(action.kind === "suspect" && chosen ? null : player.id)}
                      ring={drawerRing}
                      className={sheet ? "size-10" : face}
                    />
                  ) : (
                    <span className={`peer relative shrink-0 ${face}`}>
                      <AvatarDoodle
                        strokes={player.avatar}
                        backdrop={false}
                        hat={(you && youWearTheHat) || isBamboozler ? "worn" : undefined}
                        hatDelayMs={isBamboozler ? 600 : 0}
                        className="size-full"
                      />
                      {drawerRing}
                    </span>
                  )}
                  <span
                    className={`max-w-full min-w-0 truncate font-display leading-tight ${
                      tile
                        ? "text-4xl"
                        : crowded
                          ? "text-3xl @2xl/players:text-5xl"
                          : column
                            ? "text-4xl @2xl/players:text-5xl"
                            : ""
                    } ${active ? "text-sun" : "text-white"}`}
                  >
                    {player.name}
                    {you && (
                      <span className="ml-1.5 rounded-full bg-iris px-1.5 align-middle font-body text-xs font-semibold text-white">
                        you
                      </span>
                    )}
                    {status && <span className="sr-only">, {status}</span>}
                  </span>
                  {/* On the sheet beside the name, quiet, so it doesn't read like your vote. */}
                  {voted && sheet && (
                    <span className="ml-auto shrink-0 animate-pop-in text-xs text-white/70 motion-reduce:animate-none">
                      voted<span aria-hidden="true"> ✓</span>
                    </span>
                  )}
                </div>
                {you && action && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1 top-[3.75rem] z-10 rounded-lg bg-night px-2 py-1 text-center text-xs font-semibold text-white opacity-0 shadow-[0_3px_0_var(--color-night-deep)] transition-opacity peer-hover:opacity-100 motion-reduce:transition-none"
                  >
                    {action.kind === "vote" ? "That’s you: vote for someone else" : "That’s you: suspect someone else"}
                  </span>
                )}
                {action && !you && (
                  <button
                    type="button"
                    data-sound="own"
                    aria-pressed={chosen}
                    onClick={() => action.onChoose(action.kind === "suspect" && chosen ? null : player.id)}
                    className={`rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      sheet ? "col-start-2 row-start-2" : "mt-1.5"
                    } ${
                      action.kind === "vote"
                        ? `min-h-11 w-full px-2 font-display ${sheet ? "text-base whitespace-nowrap sideways:text-sm" : "text-lg"}`
                        : "min-h-8 px-3 text-xs font-semibold"
                    } ${
                      action.kind === "vote"
                        ? chosen
                          ? "bg-sun text-night"
                          : "text-white ring-2 ring-white/35 ring-inset hover:bg-white/10 hover:ring-white/70"
                        : chosen
                          ? "bg-berry text-night"
                          : "bg-night text-white hover:bg-night-soft"
                    }`}
                  >
                    {action.kind === "vote" ? (chosen ? "Your vote" : "Vote") : chosen ? "Suspected" : "Suspect"}
                    <span className="sr-only"> {player.name}</span>
                    {chosen && <span aria-hidden="true"> ✓</span>}
                  </button>
                )}
                {lobby && !player.ready && (
                  <p className={`mt-1.5 ${pill}`}>
                    <span className="rounded-lg bg-night px-2 py-0.5 text-white/85">
                      <span aria-hidden="true">✏️ </span>drawing their face
                    </span>
                  </p>
                )}
                {action?.kind === "vote" && action.suspectedId === player.id && !chosen && (
                  <p className={`text-xs ${sheet ? "col-span-2" : "mt-1.5"}`}>
                    <span className="rounded-lg px-2 py-0.5 text-berry ring-1 ring-berry">you suspected</span>
                  </p>
                )}
                {((voted && !sheet) || suspects.length > 0 || (yourVoteId === player.id && !action)) && (
                  <p className={`mt-1.5 flex flex-wrap gap-1 leading-snug ${pill}`}>
                    {yourVoteId === player.id && !action && (
                      <span className="rounded-lg bg-berry px-2 py-0.5 font-semibold text-night">your vote</span>
                    )}
                    {voted && !sheet && (
                      <span className="animate-pop-in rounded-lg bg-sun px-2 py-0.5 text-night motion-reduce:animate-none">
                        voted
                      </span>
                    )}
                    {suspects.length > 0 && (
                      <span
                        key={suspects.join()}
                        className={`animate-pop-in rounded-lg px-2 py-0.5 motion-reduce:animate-none ${
                          youId !== null && suspects.includes(youId) ? "bg-berry text-night" : "bg-night text-white/85"
                        }`}
                      >
                        suspected by {RoomViewUtils.names(suspects, players, youId)}
                      </span>
                    )}
                  </p>
                )}
                {outcome && (
                  <p className={`mt-1.5 flex flex-wrap gap-1 leading-snug ${pill}`}>
                    {isBamboozler && (
                      <span
                        style={{ animationDelay: "600ms" }}
                        className="animate-pop-in rounded-lg bg-berry px-2 py-0.5 font-semibold text-night motion-reduce:animate-none"
                      >
                        bamboozler
                      </span>
                    )}
                    <span
                      style={{ animationDelay: `${revealDelay}ms` }}
                      className="animate-pop-in rounded-lg bg-night px-2 py-0.5 text-white/85 motion-reduce:animate-none"
                    >
                      {votedFor === undefined ? (
                        "didn’t vote"
                      ) : (
                        <>
                          voted {RoomViewUtils.nameOf(votedFor, players, youId)}{" "}
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

              {!lobby && (
                <button
                  type="button"
                  aria-pressed={spotlit}
                  aria-label={`Spotlight ${player.name}`}
                  onClick={() => {
                    onPeek(null);
                    onSpotlight(spotlit ? null : player.id);
                  }}
                  className={`group relative block rounded-[6px_8px_7px_5px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    rail
                      ? "@5xl/room:col-start-2 @5xl/room:row-span-2 @5xl/room:row-start-1"
                      : column
                        ? "w-28 lg:aspect-[4/3] lg:h-full lg:max-h-36 lg:w-auto"
                        : ""
                  } ${sheet ? "col-start-1 row-start-2" : ""}`}
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
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
