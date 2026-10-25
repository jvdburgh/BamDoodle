import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomResultsProps = {
  players: RoomPlayer[];
  bamboozlerId: number;
  word: string;
  guess: { text: string; right: boolean } | null;
  roundNumber: number;
  rounds: number;
  youId?: number | null;
  /** Only the host moves the game on; leave out for everyone else. */
  onNext?: () => void;
  big?: boolean;
};

/** After the guess: the word, whether the bamboozler got it and what that's worth, and the way on. */
export function RoomResults({
  players,
  bamboozlerId,
  word,
  guess,
  roundNumber,
  rounds,
  youId = null,
  onNext,
  big = false,
}: RoomResultsProps) {
  const bamboozler = players.find((player) => player.id === bamboozlerId);
  const who = bamboozler?.id === youId ? "You" : (bamboozler?.name ?? "The bamboozler");
  const last = roundNumber >= rounds;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div>
        <p className="text-white/70">
          End of round {roundNumber} of {rounds}. The word was
        </p>
        <p className={`font-display text-sun ${big ? "text-6xl" : "text-4xl"}`}>{word}</p>
        <p className={`mt-1 ${big ? "text-xl" : ""}`}>
          {guess === null
            ? `${who} didn’t guess.`
            : guess.right
              ? `${who} guessed it: “${guess.text}”! +1`
              : `${who} guessed “${guess.text}”: not it, no point.`}
        </p>
      </div>
      {onNext && (
        <button type="button" onClick={onNext} className={`${BrandStyles.primaryButton} w-full max-w-xs`}>
          {last ? "See the final scores" : "Next round"}
        </button>
      )}
    </div>
  );
}
