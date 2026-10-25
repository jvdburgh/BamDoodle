import { useId, useState } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import type { RoomOutcome, RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";

type RoomPlayerStripProps = {
  players: RoomPlayer[];
  /** The player at this screen, marked "you". */
  youId: number | null;
  /** Who's drawing right now: the sun ring. */
  activeId: number | null;
  /** Everyone's points so far. */
  totals: Record<number, number>;
  /** Whose lines the canvas shows on their own. */
  spotlightId: number | null;
  onSpotlight: (playerId: number | null) => void;
  /** Who you suspect: they wear the hat on your screen. */
  suspicion: number | null;
  /** While drawing, for a player in the round: suspect someone (null takes it back). */
  onSuspect?: (playerId: number | null) => void;
  /** On the bamboozler's own screen, their face wears the fedora. */
  youWearTheHat?: boolean;
  /** After the vote: the bamboozler in the hat, who voted for whom and the round's points. */
  outcome?: RoomOutcome;
  /** While drawing: suspect → the players who marked them (public table talk). */
  suspectedBy?: Record<number, number[]>;
  /** In the vote: who has voted (never for whom). */
  votedIds?: number[];
};

/**
 * Everyone in the room as a row of faces at the top of a phone: name, points, the ring on whoever draws, the hat on
 * whoever you suspect. A tap opens what you can do with them right under the row: see their lines, suspect them.
 * While you can suspect, every other face shows the hat faintly (on hover, and always on a touch screen), so the
 * faces read as something to tap.
 */
export function RoomPlayerStrip({
  players,
  youId,
  activeId,
  totals,
  spotlightId,
  onSpotlight,
  suspicion,
  onSuspect,
  youWearTheHat = false,
  outcome,
  suspectedBy = {},
  votedIds = [],
}: RoomPlayerStripProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const panelId = useId();
  const open = players.find((player) => player.id === openId);
  const suspects = open ? (suspectedBy[open.id] ?? []) : [];

  return (
    <div className="grid gap-2">
      <ol
        aria-label="Players"
        className="-mx-3 flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain px-3 pt-1 pb-1 [scrollbar-width:none]"
      >
        {players.map((player) => {
          const you = player.id === youId;
          const active = player.id === activeId;
          const expanded = player.id === openId;
          const hat =
            outcome?.bamboozlerId === player.id || (you && youWearTheHat) || (!outcome && suspicion === player.id);
          const points = totals[player.id] ?? 0;
          return (
            <li key={player.id} className="shrink-0 snap-start">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={expanded ? panelId : undefined}
                onClick={() => setOpenId(expanded ? null : player.id)}
                className={`group relative grid w-[4.75rem] justify-items-center gap-0.5 rounded-[12px_16px_14px_10px] px-1 pt-1.5 pb-1.5 transition active:bg-night-soft motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  expanded ? "bg-night-soft" : you ? "bg-iris/20" : "bg-night-deep/70"
                } ${spotlightId === player.id ? "shadow-[inset_0_0_0_2px_var(--color-white)]" : ""} ${
                  player.connected ? "" : "opacity-50"
                }`}
              >
                <span className="relative size-11">
                  <AvatarDoodle
                    strokes={player.avatar}
                    backdrop={false}
                    hat={hat ? "worn" : onSuspect && !you ? "preview" : undefined}
                    className="size-full"
                  />
                  {active && (
                    <BrandScribble
                      shape="ring"
                      seed={player.avatarSeed}
                      weight={1.4}
                      className="pointer-events-none absolute -inset-1 size-[calc(100%+0.5rem)] text-sun"
                    />
                  )}
                </span>
                <span
                  className={`w-full truncate text-center font-display text-sm leading-tight ${active ? "text-sun" : "text-white"}`}
                >
                  {you && <span className="sr-only">{player.name}, </span>}
                  {you ? "You" : player.name}
                  <span className="sr-only">, </span>
                </span>
                {votedIds.includes(player.id) && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0.5 right-0.5 rotate-6 rounded-full bg-sun px-1.5 font-display text-xs text-night"
                  >
                    voted
                  </span>
                )}
                <span className="rounded-full bg-night px-1.5 text-xs leading-tight font-semibold text-white/80">
                  {points}
                  <span className="sr-only">
                    {points === 1 ? " point" : " points"}
                    {active && ", drawing now"}
                    {votedIds.includes(player.id) && ", voted"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {open && (
        <div id={panelId} className={`${BrandStyles.panel} flex flex-wrap items-center gap-x-3 gap-y-2 py-3`}>
          <p className="mr-auto font-display text-lg">
            {open.id === youId ? "You" : open.name}
            {outcome?.bamboozlerId === open.id && (
              <span className="ml-2 rounded-full bg-berry px-2 align-middle font-body text-xs font-semibold text-night">
                The bamboozler
              </span>
            )}
          </p>
          {outcome?.votes[open.id] !== undefined && (
            <span className="text-sm text-white/80">
              Voted {RoomViewUtils.nameOf(outcome.votes[open.id]!, players, youId)}
            </span>
          )}
          {suspects.length > 0 && (
            <span className="text-sm text-white/80">Suspected by {RoomViewUtils.names(suspects, players, youId)}</span>
          )}
          {outcome?.scores?.[open.id] && (
            <span className="text-sm text-sun">+{outcome.scores[open.id]!.points} this round</span>
          )}
          <div className="flex w-full flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={spotlightId === open.id}
              onClick={() => onSpotlight(spotlightId === open.id ? null : open.id)}
              className={`${BrandStyles.quietButton} min-h-11 flex-1 gap-2 px-3 text-base sm:text-lg`}
            >
              <BrandScribble shape="magnifier" seed={open.avatarSeed + 2} className="size-5" />
              {open.id === youId ? "See your lines" : "See their lines"}
            </button>
            {onSuspect && open.id !== youId && (
              <button
                type="button"
                data-sound="own"
                aria-pressed={suspicion === open.id}
                onClick={() => onSuspect(suspicion === open.id ? null : open.id)}
                className={`${suspicion === open.id ? BrandStyles.primaryButton : BrandStyles.quietButton} min-h-11 flex-1 gap-2 px-3 text-base sm:text-lg`}
              >
                <img src="/hat.svg" alt="" className="w-7" />
                {suspicion === open.id ? (
                  <>
                    Suspected<span aria-hidden="true"> ✓</span>
                  </>
                ) : (
                  "Suspect"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
