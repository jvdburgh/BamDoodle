import { useId } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { RoomConfetti } from "@/components/room/RoomConfetti.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { ScoreUtils } from "@/components/room/_utils/score.utils";

type RoomPodiumProps = {
  players: RoomPlayer[];
  totals: Record<string, number>;
  youId?: string | null;
  colours?: Record<string, string>;
  /** Only the host starts a new game; leave out for everyone else. */
  onNewGame?: () => void;
  /** Bigger for the host screen. */
  big?: boolean;
};

/** Where it lands visually: second on the left, first in the middle, third on the right. */
const podiumOrder = [1, 0, 2];
const steps = ["h-32", "h-24", "h-20"];
const stepColours = ["bg-sun text-night", "bg-lagoon text-night", "bg-berry text-night"];
const rises = [900, 450, 0];

/** The end of the game: a podium rising, confetti for the winner and everyone's final score (the fanfare is a room cue). */
export function RoomPodium({ players, totals, youId = null, colours, onNewGame, big = false }: RoomPodiumProps) {
  const standings = ScoreUtils.standings(
    totals,
    players.map((player) => player.id),
  );
  const playerOf = (id: string) => players.find((player) => player.id === id);
  const headingId = useId();

  const winners = standings.filter((standing) => standing.place === 1).map((standing) => playerOf(standing.playerId));
  const headline =
    winners.length > 1
      ? "It’s a tie!"
      : winners[0]?.id === youId
        ? "You win!"
        : `${winners[0]?.name ?? "Somebody"} wins!`;

  return (
    <section aria-labelledby={headingId} className="relative flex flex-col items-center gap-6 overflow-hidden py-6">
      <RoomConfetti />
      <h2
        id={headingId}
        className={`animate-pop-in font-display text-sun motion-reduce:animate-none ${big ? "text-7xl" : "text-5xl"}`}
      >
        {headline}
      </h2>
      <ol className="flex items-end justify-center gap-3" aria-label="Podium">
        {podiumOrder.map((index) => {
          const standing = standings[index];
          const player = standing && playerOf(standing.playerId);
          if (!standing || !player) return null;
          const place = standing.place;
          return (
            <li
              key={player.id}
              className="flex w-24 animate-podium-rise flex-col items-center gap-1 motion-reduce:animate-none"
              style={{ animationDelay: `${rises[index]}ms` }}
            >
              <AvatarDoodle
                strokes={player.avatar}
                color={colours?.[player.id]}
                className={index === 0 ? "size-20" : "size-14"}
              />
              <span className="max-w-full truncate font-display text-lg">
                {player.id === youId ? "You" : player.name}
              </span>
              <span
                className={`flex w-full flex-col items-center justify-start rounded-t-[14px_18px] pt-2 font-display ${steps[index]} ${stepColours[index]}`}
              >
                <span className="text-3xl">{place}</span>
                <span className="text-sm">
                  {standing.total} {standing.total === 1 ? "pt" : "pts"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {standings.length > 3 && (
        <ol start={4} className="w-full max-w-sm space-y-1">
          {standings.slice(3).map((standing) => {
            const player = playerOf(standing.playerId);
            if (!player) return null;
            return (
              <li key={player.id} className="flex items-center gap-2 rounded-full bg-night-deep/70 py-1 pr-4 pl-1">
                <span className="w-6 text-center font-display text-white/70">{standing.place}</span>
                <AvatarDoodle strokes={player.avatar} color={colours?.[player.id]} className="size-7" />
                <span className="flex-1 truncate">{player.id === youId ? "You" : player.name}</span>
                <span className="font-display">
                  {standing.total} {standing.total === 1 ? "pt" : "pts"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {onNewGame && (
        <button type="button" onClick={onNewGame} className={BrandStyles.primaryButton}>
          New game
        </button>
      )}
    </section>
  );
}
