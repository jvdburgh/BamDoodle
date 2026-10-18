import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import type { RoundScore } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";

type RoomResultsProps = {
  players: RoomPlayer[];
  bamboozlerId: number;
  word: string;
  guess: { text: string; right: boolean } | null;
  scores: Record<number, RoundScore>;
  totals: Record<number, number>;
  roundNumber: number;
  rounds: number;
  youId?: number | null;
  colours?: Record<number, string>;
  /** Only the host moves the game on; leave out for everyone else. */
  onNext?: () => void;
  big?: boolean;
};

/** After the guess: the word, who got it right, this round's points and the running scores. */
export function RoomResults({
  players,
  bamboozlerId,
  word,
  guess,
  scores,
  totals,
  roundNumber,
  rounds,
  youId = null,
  colours,
  onNext,
  big = false,
}: RoomResultsProps) {
  const bamboozler = players.find((player) => player.id === bamboozlerId);
  const who = bamboozler?.id === youId ? "You" : (bamboozler?.name ?? "The bamboozler");
  const standings = RoomViewUtils.standings(
    totals,
    players.map((player) => player.id),
  );
  const last = roundNumber >= rounds;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div>
        <p className="text-white/70">
          Round {roundNumber} of {rounds}. The word was
        </p>
        <p className={`font-display text-sun ${big ? "text-6xl" : "text-4xl"}`}>{word}</p>
        <p className={`mt-1 ${big ? "text-xl" : ""}`}>
          {guess === null
            ? `${who} didn’t guess.`
            : guess.right
              ? `${who} guessed it: “${guess.text}”!`
              : `${who} guessed “${guess.text}”. Nope.`}
        </p>
      </div>

      <table
        className={`w-full max-w-md border-separate border-spacing-y-1 text-left ${big ? "max-w-2xl text-xl" : ""}`}
      >
        <caption className="sr-only">Scores after round {roundNumber}</caption>
        <thead className="text-sm text-white/60">
          <tr>
            <th scope="col" className="px-2 font-normal">
              Player
            </th>
            <th scope="col" className="px-2 text-center font-normal">
              This round
            </th>
            <th scope="col" className="px-2 text-right font-normal">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map(({ playerId, total }) => {
            const player = players.find((candidate) => candidate.id === playerId);
            const score = scores[playerId];
            if (!player || !score) return null;
            return (
              <tr key={playerId} className="bg-night-deep/70">
                <th scope="row" className="rounded-l-full py-1 pr-2 pl-1 font-normal">
                  <span className="flex items-center gap-2">
                    <AvatarDoodle strokes={player.avatar} color={colours?.[playerId]} className="size-8 shrink-0" />
                    <span className="truncate">
                      {playerId === youId ? "You" : player.name}
                      {playerId === bamboozlerId && <span className="ml-1 text-sm text-berry">bamboozler</span>}
                    </span>
                  </span>
                </th>
                <td className="px-2 text-center">
                  <span className={score.right ? "text-sun" : "text-white/50"}>
                    {score.right ? "✓" : "✗"} <span className="font-display">+{score.points}</span>
                  </span>
                </td>
                <td className="rounded-r-full px-3 text-right font-display text-xl">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {onNext && (
        <button type="button" onClick={onNext} className={BrandStyles.primaryButton}>
          {last ? "See the final scores" : "Next round"}
        </button>
      )}
    </div>
  );
}
