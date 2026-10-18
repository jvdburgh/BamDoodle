import { useLayoutEffect, useRef } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasBoard } from "@/components/canvas/CanvasBoard.component";
import { RoomFeed } from "@/components/room/RoomFeed.component";
import { JOIN_AT, RoomJoinCard } from "@/components/room/RoomJoinCard.component";
import { RoomPenTag } from "@/components/room/RoomPenTag.component";
import { RoomPlayerList } from "@/components/room/RoomPlayerList.component";
import { RoomPodium } from "@/components/room/RoomPodium.component";
import { RoomResults } from "@/components/room/RoomResults.component";
import { RoomReveal } from "@/components/room/RoomReveal.component";
import { RoomRoundClock } from "@/components/room/RoomRoundClock.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnBar } from "@/components/room/RoomTurnBar.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import type { RoomSimulation } from "@/components/room/_hooks/roomSimulation.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";

type RoomHostViewProps = {
  sim: RoomSimulation;
  roomCode: string;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
};

/**
 * The optional big screen (TV, beamer, laptop): the canvas large, everyone's mini-maps, the table talk, the vote,
 * the reveal and the scores. It never gets the word and nobody draws on it.
 */
export function RoomHostView({ sim, roomCode, revealCode = false }: RoomHostViewProps) {
  const { players, setup, drawing, round, now, word, identities, active, next, order } = sim;
  const { phase } = round;
  const spotlight = useSpotlight();
  const playersRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);

  // A phase change that took keyboard focus with it hands it to the players (always there) or the podium.
  useLayoutEffect(() => {
    if (phase === "waiting") return;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    (sim.gameOver ? podiumRef : playersRef).current?.focus({ preventScroll: true });
  }, [phase, sim.gameOver]);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const bamboozler = players.find((player) => player.id === round.bamboozlerId);

  return (
    <div className="@container/room relative min-h-full">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pb-20 @4xl/room:gap-6 @4xl/room:p-8 @4xl/room:pb-24">
        <header className="grid grid-cols-[1fr_auto] items-center gap-4 @4xl/room:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3">
            <BrandLogo href="/?screen=start" className="size-12 @4xl/room:size-16" />
            <div className="leading-tight">
              <p className="font-display text-2xl @4xl/room:text-4xl">BamDoodle</p>
              <BrandTagline className="text-sm @4xl/room:text-base" />
            </div>
          </div>
          <div className="col-span-2 row-start-2 @4xl/room:col-span-1 @4xl/room:row-start-auto">
            <RoomWordCard category={word.category} word={null} view="host" />
          </div>
          <div className="col-start-2 row-start-1 flex items-center gap-4 justify-self-end @4xl/room:col-start-3">
            <p className="text-right leading-tight text-white/75">
              Round <span className="font-display text-2xl text-white">{sim.roundNumber}</span> of {setup.rounds}
              {phase === "drawing" && (
                <>
                  <br />
                  Lap <span className="font-display text-2xl text-white">
                    {RoundUtils.lap(round, players.length)}
                  </span>{" "}
                  of {RoundUtils.lapsFor(setup)}
                </>
              )}
            </p>
            <SoundToggle />
          </div>
        </header>

        {sim.gameOver ? (
          <div ref={podiumRef} tabIndex={-1} className="outline-none">
            <RoomPodium players={players} totals={sim.totals} colours={identities} onNewGame={sim.newGame} big />
          </div>
        ) : (
          <div className="flex flex-col gap-4 @4xl/room:gap-6">
            <div ref={playersRef} tabIndex={-1} role="group" aria-label="Players" className="outline-none">
              <RoomPlayerList
                players={players}
                drawing={drawing}
                youId={null}
                activeId={active?.id ?? null}
                nextId={next?.id ?? null}
                spotlightId={spotlight.pinned}
                onSpotlight={spotlight.pin}
                onPeek={spotlight.setPeek}
                colours={identities}
                suspectedBy={RoundUtils.suspectedBy(round)}
                votedIds={phase === "voting" ? Object.keys(round.votes) : []}
                layout="row"
              />
            </div>

            <div className="mx-auto flex w-full min-w-0 flex-col gap-4 @4xl/room:max-w-[calc((100svh-31rem)*4/3)] @4xl/room:min-w-[36rem]">
              {(phase === "waiting" || phase === "drawing" || phase === "voting") && (
                <CanvasBoard
                  drawing={drawing}
                  order={order}
                  activePlayerId={null}
                  color="transparent"
                  brushSize={0}
                  spotlightId={spotlight.shown}
                  label={active ? `Shared drawing. ${active.name} is drawing.` : "Shared drawing."}
                  penTag={active && <RoomPenTag player={active} color={identities?.[active.id]} />}
                >
                  {spotlit && (
                    <div className="absolute top-3 left-3">
                      <RoomSpotlightChip
                        player={spotlit}
                        onClear={
                          spotlight.pinned
                            ? () => {
                                spotlight.pin(null);
                                playersRef.current?.focus();
                              }
                            : undefined
                        }
                      />
                    </div>
                  )}
                  <div className="absolute right-3 bottom-3 max-w-[60%]">
                    <RoomFeed lines={sim.feed} players={players} big />
                  </div>
                  {active && <RoomTurnCall turn={round.turnCount} text={`${active.name}’s turn`} big />}
                  {phase === "voting" && (
                    <div className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-4 rounded-[18px_24px_20px_16px] bg-night/95 p-4">
                      <BrandSketchyFrame className="text-sun" />
                      <div>
                        <p className="animate-rise-in font-display text-4xl text-sun motion-reduce:animate-none">
                          Time’s up! Who’s sketchy?
                        </p>
                        <p className="mt-1 text-lg text-white/80">
                          Who do you think didn’t know the word? Vote on your phone.
                        </p>
                      </div>
                      <div className="text-right">
                        <RoomRoundClock msLeft={RoundUtils.phaseLeft(round, now)} />
                        <p className="text-white/70">
                          {Object.keys(round.votes).length} of {players.length} voted
                        </p>
                      </div>
                    </div>
                  )}
                  {phase === "waiting" && (
                    <div className="absolute inset-0 grid place-items-center p-4">
                      <RoomJoinCard roomCode={roomCode} reveal={revealCode} big>
                        <button
                          type="button"
                          onClick={() => {
                            sim.start();
                            playersRef.current?.focus();
                          }}
                          className={BrandStyles.primaryButton}
                        >
                          Start round
                        </button>
                      </RoomJoinCard>
                    </div>
                  )}
                </CanvasBoard>
              )}

              {phase === "drawing" && active && (
                <div className={BrandStyles.panel}>
                  <RoomTurnBar
                    title={`${active.name}’s turn`}
                    hint="Watch what they draw"
                    mode={round.mode}
                    msLeft={RoundUtils.turnLeft(round, now)}
                    msTotal={round.turnMs}
                  />
                </div>
              )}

              {phase === "reveal" && (
                <div className={BrandStyles.panel}>
                  <RoomReveal
                    players={players}
                    bamboozlerId={round.bamboozlerId}
                    votes={round.votes}
                    colours={identities}
                    big
                  />
                </div>
              )}
              {phase === "guess" && (
                <div className={`${BrandStyles.panel} text-center`}>
                  <p className="font-display text-4xl">
                    {bamboozler?.name ?? "The bamboozler"} gets one guess at the word…
                  </p>
                  <div className="mt-3 inline-block">
                    <RoomRoundClock msLeft={RoundUtils.phaseLeft(round, now)} />
                  </div>
                </div>
              )}
              {phase === "results" && sim.roundScores && (
                <div className={BrandStyles.panel}>
                  <RoomResults
                    players={players}
                    bamboozlerId={round.bamboozlerId}
                    word={word.word}
                    guess={round.guess}
                    scores={sim.roundScores}
                    totals={sim.totals}
                    roundNumber={sim.roundNumber}
                    rounds={setup.rounds}
                    colours={identities}
                    onNext={sim.nextRound}
                    big
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {phase !== "waiting" && !sim.gameOver && (
        <p className="absolute bottom-4 left-4 flex items-baseline gap-2 rounded-[12px_16px_14px_10px] bg-night-deep px-4 py-2 text-white/80 @4xl/room:bottom-6 @4xl/room:left-8">
          Join at <span className="font-semibold text-white">{JOIN_AT}</span>
          <span className="sr-only">with room code</span>
          <span className="font-display text-3xl tracking-[0.2em] text-white">{roomCode}</span>
        </p>
      )}
    </div>
  );
}
