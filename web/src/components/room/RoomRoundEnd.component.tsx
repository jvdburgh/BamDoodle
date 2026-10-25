import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { RoomGuess } from "@/components/room/RoomGuess.component";
import { RoomResults } from "@/components/room/RoomResults.component";
import { RoomReveal } from "@/components/room/RoomReveal.component";
import { RoomRoundScores } from "@/components/room/RoomRoundScores.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { Reveal } from "@/protocol/generated/Reveal";
import type { RoundResult } from "@/protocol/generated/RoundResult";

type RoomRoundEndProps = {
  players: RoomPlayer[];
  youId: number | null;
  /** The reveal and the bamboozler's guess, with who played the round (`turnOrder`): they're the ones who count. */
  reveal: { reveal: Reveal; playerIds: number[]; category: string; guessMsLeft: number } | null;
  result: RoundResult | null;
  youAreBamboozler: boolean;
  /** Everyone's points so far, this round included. */
  totals: Record<number, number>;
  isHost: boolean;
  /** Who starts the next round, for everyone else's waiting line: a host screen's name, or the host player's. */
  hostScreen: string | null;
  hostName: string | undefined;
  onGuess: (text: string) => void;
  onNextRound: () => void;
  /** After the last round: anyone can open the podium. */
  onFinalScores: () => void;
  onSettings?: () => void;
};

/**
 * A player's panel after the vote: who the bamboozler was and what that's worth, with their one guess; then the word,
 * this round's points ("This round") and the way on, the host's Next round or who everyone's waiting for, in one spot.
 */
export function RoomRoundEnd({
  players,
  youId,
  reveal,
  result,
  youAreBamboozler,
  totals,
  isHost,
  hostScreen,
  hostName,
  onGuess,
  onNextRound,
  onFinalScores,
  onSettings,
}: RoomRoundEndProps) {
  const bamboozlerId = reveal?.reveal.bamboozlerId ?? result?.bamboozlerId;
  const bamboozler = players.find((player) => player.id === bamboozlerId);
  const nextRound = (result?.number ?? 0) + 1;

  return (
    <>
      {reveal && (
        <>
          <RoomReveal
            players={players}
            playerIds={reveal.playerIds}
            bamboozlerId={reveal.reveal.bamboozlerId}
            votes={RoomViewUtils.votes(reveal.reveal.votes)}
            youId={youId}
          />
          {/* On a phone on its side the bamboozler's field comes first, beside the drawing. */}
          <div className={youAreBamboozler ? "sideways:-order-1" : ""}>
            <RoomGuess
              bamboozlerName={bamboozler?.name ?? "The bamboozler"}
              category={reveal.category}
              yours={youAreBamboozler}
              msLeft={reveal.guessMsLeft}
              onGuess={onGuess}
            />
          </div>
        </>
      )}
      {result && (
        // One column on a phone (the word, this round, the way on); with room, this round beside the rest.
        <div className="@container/round">
          <div className="grid gap-4 @2xl/round:grid-cols-2 @2xl/round:items-start">
            <RoomResults
              players={players}
              bamboozlerId={result.bamboozlerId}
              word={result.word}
              guess={result.guess === null ? null : { text: result.guess, right: result.guessCorrect }}
              roundNumber={result.number}
              rounds={result.rounds}
              youId={youId}
            />
            <div className="@2xl/round:col-start-2 @2xl/round:row-span-2 @2xl/round:row-start-1">
              <RoomRoundScores players={players} result={result} totals={totals} youId={youId} />
            </div>
            <div className="grid justify-items-center gap-2 text-center">
              {result.gameOver || isHost ? (
                <button
                  type="button"
                  onClick={result.gameOver ? onFinalScores : onNextRound}
                  className={`${BrandStyles.primaryButton} w-full max-w-xs`}
                >
                  {result.gameOver ? "See the final scores" : "Next round"}
                </button>
              ) : (
                <p className="text-white/70">
                  {hostScreen
                    ? `${hostScreen} starts round ${nextRound} from the big screen…`
                    : `Waiting for ${hostName ?? "the host"} to start round ${nextRound}…`}
                </p>
              )}
              {isHost && onSettings && (
                <button type="button" onClick={onSettings} className={BrandStyles.ghostButton}>
                  Room settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
