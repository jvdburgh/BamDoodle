import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
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
import { useRoomView } from "@/components/room/_hooks/roomView.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import type { Attribution, RoomViewState } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";

const PODIUM_AFTER_MS = 10_000;

type RoomHostViewProps = {
  /** A host screen's state (`watchRoom`): never the word, never a role. */
  state: RoomViewState;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
  /** Free colours, or a shade family per player (the lab only, until the server has the setting). */
  colours?: Attribution;
  /** Where the logo leads. */
  home?: string;
};

/**
 * The optional big screen (TV, beamer, laptop): the canvas large, everyone's mini-maps, the table talk, the vote,
 * the reveal and the scores. It never gets the word and nobody draws on it.
 */
export function RoomHostView({ state, revealCode = false, colours = "free", home = "/" }: RoomHostViewProps) {
  const view = useRoomView(state, colours);
  const { room, phase, round, reveal, result, now, players, identities, drawing, active, next, order } = view;
  const roomCode = room.code;
  const spotlight = useSpotlight();
  /** After the last round, the results first, then the podium. */
  const [podiumFor, setPodiumFor] = useState<string | null>(null);
  const resultKey = result?.gameOver ? `${result.number}/${result.word}` : null;
  const showPodium = resultKey !== null && podiumFor === resultKey;
  useEffect(() => {
    if (resultKey === null) return;
    const timer = window.setTimeout(() => setPodiumFor(resultKey), PODIUM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [resultKey]);
  const playersRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);

  // A phase change that took keyboard focus with it hands it to the players (always there) or the podium.
  useLayoutEffect(() => {
    if (phase === "lobby") return;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    (showPodium ? podiumRef : playersRef).current?.focus({ preventScroll: true });
  }, [phase, showPodium]);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const bamboozler = players.find((player) => player.id === view.bamboozlerId);

  return (
    <div className="@container/room relative min-h-full">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pb-20 @4xl/room:gap-6 @4xl/room:p-8 @4xl/room:pb-24">
        <header className="grid grid-cols-[1fr_auto] items-center gap-4 @4xl/room:grid-cols-[1fr_auto_1fr]">
          <BrandLogo
            named
            href={home}
            className="size-12 @4xl/room:size-16"
            nameClassName="text-sm @4xl/room:text-xl"
          />
          <div className="col-span-2 row-start-2 @4xl/room:col-span-1 @4xl/room:row-start-auto">
            {view.category !== null && <RoomWordCard category={view.category} word={null} view="host" />}
          </div>
          <div className="col-start-2 row-start-1 flex items-center gap-4 justify-self-end @4xl/room:col-start-3">
            <p className="text-right leading-tight text-white/75">
              {phase === "lobby" ? (
                <>
                  <span className="font-display text-2xl text-white">{players.length}</span>{" "}
                  {players.length === 1 ? "player" : "players"}
                </>
              ) : (
                <>
                  Round <span className="font-display text-2xl text-white">{view.roundNumber}</span> of {view.rounds}
                </>
              )}
              {phase === "drawing" && round && (
                <>
                  <br />
                  Turn <span className="font-display text-2xl text-white">{round.turn}</span> of {round.turnsPerPlayer}
                </>
              )}
            </p>
            <SoundToggle channel="music" />
            <SoundToggle />
          </div>
        </header>

        {state.status === "reconnecting" && (
          <p role="status" className="rounded-full bg-night-soft px-4 py-2 text-center text-lg text-white">
            Lost the connection. Getting back in…
          </p>
        )}

        {showPodium ? (
          <div ref={podiumRef} tabIndex={-1} className="outline-none">
            <RoomPodium players={players} totals={RoomViewUtils.totals(room.players)} colours={identities} big />
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
                suspectedBy={phase === "drawing" ? RoomViewUtils.suspectedBy(round) : {}}
                votedIds={phase === "voting" ? (round?.voted ?? []) : []}
                layout="row"
              />
            </div>

            <div className="mx-auto flex w-full min-w-0 flex-col gap-4 @4xl/room:max-w-[calc((100svh-31rem)*4/3)] @4xl/room:min-w-[36rem]">
              {(phase === "lobby" || phase === "drawing" || phase === "voting") && (
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
                    <BrandSketchyFrame bold className="animate-pop-in text-night motion-reduce:animate-none" />
                  )}
                  {spotlit && (
                    <div className="absolute top-3 left-3">
                      <RoomSpotlightChip player={spotlit} />
                    </div>
                  )}
                  <div className="absolute right-3 bottom-3 max-w-[60%]">
                    <RoomFeed lines={view.feed} players={players} big />
                  </div>
                  {active && <RoomTurnCall turn={RoomViewUtils.turnCount(round)} text={`${active.name}’s turn`} big />}
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
                        <RoomRoundClock msLeft={ClockUtils.left(state.timers.voting, now)} />
                        <p className="text-white/70">
                          {round?.voted.length ?? 0} of {round?.turnOrder.length ?? 0} voted
                        </p>
                      </div>
                    </div>
                  )}
                  {phase === "lobby" && (
                    <div className="absolute inset-0 grid place-items-center p-4">
                      <RoomJoinCard roomCode={roomCode} reveal={revealCode} big>
                        <p className="text-center text-xl text-white/80">
                          {view.host ? `${view.host.name} starts the round from their phone.` : "Waiting for players…"}
                        </p>
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
                    mode={room.settings.mode}
                    msLeft={ClockUtils.left(state.timers.turn, now)}
                    msTotal={state.timers.turn?.totalMs ?? 0}
                  />
                </div>
              )}

              {reveal && (
                <div className={`${BrandStyles.panel} flex flex-col items-center gap-4 text-center`}>
                  <RoomReveal
                    players={players}
                    bamboozlerId={reveal.bamboozlerId}
                    votes={RoomViewUtils.votes(reveal.votes)}
                    colours={identities}
                    big
                  />
                  <p className="font-display text-4xl">
                    {bamboozler?.name ?? "The bamboozler"} gets one guess at the word…
                  </p>
                  <RoomRoundClock msLeft={ClockUtils.left(state.timers.guess, now)} />
                </div>
              )}
              {result && (
                <div className={BrandStyles.panel}>
                  <RoomResults
                    players={players}
                    bamboozlerId={result.bamboozlerId}
                    word={result.word}
                    guess={result.guess === null ? null : { text: result.guess, right: result.guessCorrect }}
                    scores={RoomViewUtils.roundScores(result)}
                    totals={RoomViewUtils.totals(room.players)}
                    roundNumber={result.number}
                    rounds={result.rounds}
                    colours={identities}
                    big
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {phase !== "lobby" && !showPodium && (
        <p className="absolute bottom-4 left-4 flex items-baseline gap-2 rounded-[12px_16px_14px_10px] bg-night-deep px-4 py-2 text-white/80 @4xl/room:bottom-6 @4xl/room:left-8">
          Join at <span className="font-semibold text-white">{JOIN_AT}</span>
          <span className="sr-only">with room code</span>
          <span className="font-display text-3xl tracking-[0.2em] text-white">{roomCode}</span>
        </p>
      )}
    </div>
  );
}
