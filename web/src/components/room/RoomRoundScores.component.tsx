import { useId } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { RoundResult } from "@/protocol/generated/RoundResult";

type RoomRoundScoresProps = {
  players: RoomPlayer[];
  result: RoundResult;
  /** Everyone's points so far, this round included. */
  totals: Record<number, number>;
  /** The player at this screen, "You"; null on the host screen. */
  youId: number | null;
  /** The host screen's scoreboard: read from across the room. */
  big?: boolean;
};

/**
 * "This round": every player's points and why ("voted Mo ✓ +1", "slipped through +1"), most first, with their
 * total. On the phone's results and as the host screen's scoreboard.
 */
export function RoomRoundScores({ players, result, totals, youId, big = false }: RoomRoundScoresProps) {
  const headingId = useId();
  const lines = RoomViewUtils.roundLines(result, players, youId);
  return (
    <section aria-labelledby={headingId} className="grid w-full gap-2">
      <h3 id={headingId} className={`font-display ${big ? "text-4xl" : "text-xl"}`}>
        This round
      </h3>
      <ol aria-labelledby={headingId} className={`grid text-left ${big ? "gap-3" : "gap-1.5"}`}>
        {lines.map((line, index) => {
          const player = players.find((seat) => seat.id === line.playerId);
          if (!player) return null;
          const total = totals[player.id] ?? 0;
          return (
            <li
              key={line.playerId}
              style={{ animationDelay: `${index * 120}ms` }}
              className={`grid animate-rise-in grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[12px_16px_14px_10px] bg-night-deep/70 motion-reduce:animate-none ${
                big ? "px-4 py-3" : "px-2 py-1.5"
              }`}
            >
              <AvatarDoodle strokes={player.avatar} backdrop={false} className={big ? "size-14" : "size-9"} />
              <span className="min-w-0">
                <span className={`block truncate font-display ${big ? "text-3xl" : "text-lg"} leading-tight`}>
                  {player.id === youId ? "You" : player.name}
                </span>
                <span className={`block truncate text-white/70 ${big ? "text-xl" : "text-sm"}`}>
                  {line.reasons.join(", ")}
                </span>
              </span>
              <span className="text-right leading-tight">
                <span
                  // Points pop in once their row is there.
                  style={line.points > 0 ? { animationDelay: `${index * 120 + 450}ms` } : undefined}
                  className={`block font-display ${
                    line.points > 0 ? "animate-pop-in text-sun motion-reduce:animate-none" : "text-white/50"
                  } ${big ? "text-4xl" : "text-xl"}`}
                >
                  {line.points > 0 ? `+${line.points}` : "0"}
                </span>
                <span className={`block text-white/70 ${big ? "text-lg" : "text-xs"}`}>
                  {total} {total === 1 ? "point" : "points"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
