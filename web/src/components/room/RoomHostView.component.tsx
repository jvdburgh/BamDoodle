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
import type { RoomViewState } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";

const PODIUM_AFTER_MS = 10_000;

type RoomHostViewProps = {
  /** A host screen's state (`watchRoom`): never the word, never a role. */
  state: RoomViewState;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
  /** Where the logo leads. */
  home?: string;
  /** When this screen hosts the room (`hostRoom`): starting rounds and the settings. */
  controls?: { onStart: () => void; onSettings: () => void };
};

/**
 * The optional big screen (TV, beamer, laptop): the canvas large, everyone's mini-maps, the table talk, the vote,
 * the reveal and the scores. It never gets the word and nobody draws on it.
 */
export function RoomHostView({ state, revealCode = false, home = "/", controls }: RoomHostViewProps) {
  const view = useRoomView(state);
  const { room, phase, round, reveal, result, now, players, drawing, active, next, order } = view;
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
  const waiting = RoomViewUtils.waitingForPlayers(players);
  /** What the server just turned down, for the host screen (say, a player left right before Start round). */
  const problem = controls && view.problem ? RoomViewUtils.problem(view.problem) : null;
  const stillDrawing = RoomViewUtils.stillOnTheirFace(players.filter((player) => player.connected));

  const playerList = (
    <div ref={playersRef} tabIndex={-1} role="group" aria-label="Players" className="w-full outline-none">
      <RoomPlayerList
        players={players}
        drawing={drawing}
        youId={null}
        activeId={active?.id ?? null}
        nextId={next?.id ?? null}
        spotlightId={spotlight.pinned}
        onSpotlight={spotlight.pin}
        onPeek={spotlight.setPeek}
        suspectedBy={phase === "drawing" ? RoomViewUtils.suspectedBy(round) : {}}
        votedIds={phase === "voting" ? (round?.voted ?? []) : []}
        outcome={RoomViewUtils.outcome(reveal, result, room.players)}
        lobby={phase === "lobby"}
        layout={phase === "lobby" ? "row" : "grid"}
      />
    </div>
  );

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
            <RoomPodium
              players={players}
              totals={RoomViewUtils.totals(room.players)}
              onNewGame={controls?.onStart}
              big
            />
          </div>
        ) : phase === "lobby" ? (
          // How to get in comes first, big, the way a quiz night shows it; then who's in.
          <div className="flex flex-col items-center gap-6 @4xl/room:gap-8">
            <RoomJoinCard roomCode={roomCode} reveal={revealCode} big>
              {controls ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={controls.onStart}
                      disabled={waiting !== null}
                      className={BrandStyles.primaryButton}
                    >
                      Start round
                    </button>
                    <button type="button" onClick={controls.onSettings} className={BrandStyles.quietButton}>
                      Room settings
                    </button>
                  </div>
                  <p className="text-center text-xl text-white/80">
                    {waiting ??
                      (stillDrawing && (
                        <>
                          <span aria-hidden="true">✏️ </span>
                          {stillDrawing}
                        </>
                      )) ??
                      "Everyone’s in? Start when you’re ready."}
                  </p>
                  {problem && (
                    <p role="alert" className="text-center text-lg text-berry">
                      {problem}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-xl text-white/80">
                  {view.host
                    ? `${view.host.name} starts the round from their phone.`
                    : room.hostScreen
                      ? `${room.hostScreen} starts the round from the host screen.`
                      : "Waiting for players…"}
                </p>
              )}
            </RoomJoinCard>
            {playerList}
          </div>
        ) : (
          // During a round the drawing is the big thing; on a wide screen the players are a rail beside it.
          <div className="flex flex-col gap-4 @4xl/room:gap-6 @5xl/room:grid @5xl/room:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] @5xl/room:items-start">
            <div className="@5xl/room:col-start-2 @5xl/room:row-start-1">{playerList}</div>

            <div className="mx-auto flex w-full min-w-0 flex-col gap-4 @4xl/room:max-w-[calc((100svh-14rem)*4/3)] @5xl/room:col-start-1 @5xl/room:row-start-1">
              {(phase === "drawing" || phase === "voting") && (
                <CanvasBoard
                  drawing={drawing}
                  order={order}
                  activePlayerId={null}
                  color="transparent"
                  brushSize={0}
                  spotlightId={spotlight.shown}
                  label={active ? `Shared drawing. ${active.name} is drawing.` : "Shared drawing."}
                  penTag={active && <RoomPenTag player={active} />}
                >
                  {spotlit && (
                    <BrandSketchyFrame bold className="animate-pop-in text-night motion-reduce:animate-none" />
                  )}
                  {spotlit && (
                    <div className="absolute top-3 left-3">
                      <RoomSpotlightChip
                        player={spotlit}
                        onClear={spotlight.pinned === spotlit.id ? () => spotlight.pin(null) : undefined}
                      />
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
                    roundNumber={result.number}
                    rounds={result.rounds}
                    onNext={result.gameOver ? () => setPodiumFor(resultKey) : controls?.onStart}
                    big
                  />
                  {controls && (
                    <div className="mt-3 grid justify-items-center gap-2">
                      <button type="button" onClick={controls.onSettings} className={BrandStyles.ghostButton}>
                        Room settings
                      </button>
                      {problem && (
                        <p role="alert" className="text-center text-lg text-berry">
                          {problem}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {phase !== "lobby" && !showPodium && (
        <p className="fixed bottom-4 left-4 z-10 flex items-baseline gap-2 rounded-[12px_16px_14px_10px] bg-night-deep px-4 py-2 text-white/80 @4xl/room:bottom-6 @4xl/room:left-8">
          Join at <span className="font-semibold text-white">{JOIN_AT}</span>
          <span className="sr-only">with room code</span>
          <span className="font-display text-3xl tracking-[0.2em] text-white">{roomCode}</span>
        </p>
      )}
    </div>
  );
}
