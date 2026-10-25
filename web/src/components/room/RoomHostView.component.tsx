import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasBoard } from "@/components/canvas/CanvasBoard.component";
import { RoomFeed } from "@/components/room/RoomFeed.component";
import { JOIN_AT, RoomJoinCard } from "@/components/room/RoomJoinCard.component";
import { RoomJoinQr } from "@/components/room/RoomJoinQr.component";
import { RoomPenTag } from "@/components/room/RoomPenTag.component";
import { RoomPlayerList } from "@/components/room/RoomPlayerList.component";
import { RoomPodium } from "@/components/room/RoomPodium.component";
import { RoomResults } from "@/components/room/RoomResults.component";
import { RoomReveal } from "@/components/room/RoomReveal.component";
import { RoomRoundClock } from "@/components/room/RoomRoundClock.component";
import { RoomRoundScores } from "@/components/room/RoomRoundScores.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnBar } from "@/components/room/RoomTurnBar.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { useRoomView } from "@/components/room/_hooks/roomView.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import type { RoomViewState } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";

const PODIUM_AFTER_MS = 10_000;

/** A band sliding in over the drawing's lower part: the vote, the reveal, the word. */
const band =
  "absolute inset-x-3 bottom-3 flex animate-rise-in flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-[18px_24px_20px_16px] bg-night/95 px-6 py-4 motion-reduce:animate-none";

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
 * The optional big screen (TV, beamer, laptop), read from the couch: one screen high, the drawing as the stage with
 * everyone's mini-maps beside it, the vote, the reveal and the scores sliding in over it. It never gets the word and
 * nobody draws on it.
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
  const sideRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);

  // A phase change that took keyboard focus with it hands it to the players or scores (always there) or the podium.
  useLayoutEffect(() => {
    if (phase === "lobby") return;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    (showPodium ? podiumRef : sideRef).current?.focus({ preventScroll: true });
  }, [phase, showPodium]);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const bamboozler = players.find((player) => player.id === view.bamboozlerId);
  const waiting = RoomViewUtils.waitingForPlayers(players);
  /** Who's in the room right now, as the phones count them. */
  const here = players.filter((player) => player.connected).length;
  /** What the server just turned down, for the host screen (say, a player left right before Start round). */
  const problem = controls && view.problem ? RoomViewUtils.problem(view.problem) : null;
  const stillDrawing = RoomViewUtils.stillOnTheirFace(players.filter((player) => player.connected));
  const turnSeconds = Math.ceil(ClockUtils.left(state.timers.turn, now) / 1000);
  const headline =
    phase === "drawing" && active
      ? `${active.name}’s turn · ${turnSeconds}s`
      : result
        ? result.gameOver
          ? "Final round’s scores"
          : `Word ${result.number}’s scores`
        : "Who’s sketchy?";

  const problemLine = problem && (
    <p role="alert" className="text-center text-2xl text-berry">
      {problem}
    </p>
  );

  const playerList = (
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
      layout={phase === "lobby" ? "row" : "column"}
    />
  );

  return (
    <div className="@container/room relative flex min-h-svh flex-col gap-3 px-4 py-3 lg:h-svh lg:gap-4 lg:px-8 lg:py-5">
      <header className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <BrandLogo named href={home} confirmLeave className="size-12 lg:size-16" nameClassName="text-lg lg:text-2xl" />
        <div className="col-span-2 row-start-2 lg:col-span-1 lg:row-start-auto">
          {view.category !== null && (
            <p className="flex flex-col items-center gap-2 text-center leading-none">
              <span className="rounded-full bg-night-soft px-4 py-1.5 text-2xl text-white">
                <span className="sr-only">Category: </span>
                {view.category}
              </span>
              <span className="relative px-2 font-display text-4xl lg:text-5xl">
                {headline}
                <BrandScribble
                  shape="underline"
                  seed={(active?.name ?? headline).length}
                  className="absolute inset-x-0 -bottom-3 h-3 w-full text-berry"
                />
              </span>
            </p>
          )}
        </div>
        <div className="col-start-2 row-start-1 flex items-center gap-4 justify-self-end lg:col-start-3">
          <p className="text-right font-display leading-tight text-white">
            {phase === "lobby" ? (
              <span className="text-3xl">
                {here} {here === 1 ? "player" : "players"}
              </span>
            ) : (
              <span className="text-3xl lg:text-4xl">
                Word {view.roundNumber} of {view.rounds}
              </span>
            )}
            {phase === "drawing" && round && (
              <span className="block text-2xl text-white/90">
                Turn {round.turn} of {round.turnsPerPlayer} each
              </span>
            )}
          </p>
          <SoundToggle channel="music" />
          <SoundToggle />
        </div>
      </header>

      {state.status === "reconnecting" && (
        <p role="status" className="rounded-full bg-night-soft px-4 py-2 text-center text-2xl text-white">
          Lost the connection. Getting back in…
        </p>
      )}

      {showPodium ? (
        <div ref={podiumRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <RoomPodium
            players={players}
            totals={RoomViewUtils.totals(room.players)}
            history={state.history}
            onNewGame={controls?.onStart}
            big
          />
        </div>
      ) : phase === "lobby" ? (
        // How to get in comes first, big, the way a quiz night shows it; then who's in.
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-6 overflow-y-auto lg:gap-10">
          <RoomJoinCard roomCode={roomCode} reveal={revealCode} big>
            <div className="flex flex-col items-center gap-3">
              {controls ? (
                <>
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
                  <p className="text-center text-2xl text-white/85">
                    {waiting ??
                      (stillDrawing && (
                        <>
                          <span aria-hidden="true">✏️ </span>
                          {stillDrawing}
                        </>
                      )) ??
                      "Everyone’s in? Start when you’re ready."}
                  </p>
                  {problemLine}
                </>
              ) : (
                <p className="text-center text-2xl text-white/85">
                  {view.host
                    ? `${view.host.name} starts the round from their phone.`
                    : room.hostScreen
                      ? `${room.hostScreen} starts the round from the big screen.`
                      : "Waiting for players…"}
                </p>
              )}
              <p className="text-center text-2xl text-white">
                <span className="sr-only">Settings: </span>
                {RoomViewUtils.settingsLine(room.settings)}
              </p>
            </div>
          </RoomJoinCard>
          <div className="w-full">{playerList}</div>
        </div>
      ) : (
        // The drawing is the stage, as big as one screen allows with the players beside it. Under it, a row of its own
        // for how to join and the turn bar, so neither ever covers the other or the drawing.
        <div className="min-h-0 flex-1 lg:[container-type:size]">
          <div className="flex flex-col gap-4 lg:grid lg:h-full lg:grid-cols-[min(calc(100cqw-25rem),calc((100cqh-6.75rem)*4/3))_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_6rem] lg:gap-x-6 lg:gap-y-3">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
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
                {spotlit && <BrandSketchyFrame bold className="animate-pop-in text-night motion-reduce:animate-none" />}
                {spotlit && (
                  <div className="absolute top-3 left-3">
                    <RoomSpotlightChip
                      player={spotlit}
                      onClear={spotlight.pinned === spotlit.id ? () => spotlight.pin(null) : undefined}
                    />
                  </div>
                )}
                {(phase === "drawing" || phase === "voting") && (
                  <div className={`absolute right-3 max-w-[60%] ${phase === "voting" ? "top-3" : "bottom-3"}`}>
                    <RoomFeed lines={view.feed} players={players} big />
                  </div>
                )}
                {active && <RoomTurnCall turn={RoomViewUtils.turnCount(round)} text={`${active.name}’s turn`} big />}
                {phase === "voting" && (
                  <div className={band}>
                    <BrandSketchyFrame className="text-sun" />
                    <div className="min-w-0">
                      <p className="font-display text-5xl text-sun">Time’s up!</p>
                      <p className="mt-1 text-2xl text-white/85">Vote on your phone.</p>
                    </div>
                    <div className="flex items-center gap-8 text-right">
                      <p className="font-display text-6xl leading-none">
                        {round?.voted.length ?? 0} of {round?.turnOrder.length ?? 0} voted
                      </p>
                      <RoomRoundClock msLeft={ClockUtils.left(state.timers.voting, now)} big />
                    </div>
                  </div>
                )}
                {reveal && (
                  <div className={band}>
                    <RoomReveal
                      players={players}
                      playerIds={round?.turnOrder}
                      bamboozlerId={reveal.bamboozlerId}
                      votes={RoomViewUtils.votes(reveal.votes)}
                      big
                    />
                    <div className="flex flex-col items-end gap-2 text-right">
                      <p className="max-w-[14ch] font-display text-2xl @7xl/room:text-3xl">
                        {bamboozler?.name ?? "The bamboozler"} gets one guess at the word…
                      </p>
                      <RoomRoundClock msLeft={ClockUtils.left(state.timers.guess, now)} />
                    </div>
                  </div>
                )}
                {result && (
                  <div className={band}>
                    <div className="min-w-0 flex-1">
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
                    </div>
                  </div>
                )}
              </CanvasBoard>
            </div>

            <footer className="flex min-w-0 items-center gap-4 lg:col-start-1 lg:row-start-2">
              <p className="flex shrink-0 items-center gap-4 rounded-[12px_16px_14px_10px] bg-night-deep py-2 pr-5 pl-2 text-2xl leading-tight text-white/85">
                <RoomJoinQr roomCode={roomCode} className="size-20 shrink-0 p-0.5" />
                <span>
                  Join at <span className="font-semibold text-white">{JOIN_AT}</span>
                  <span className="sr-only"> with room code</span>{" "}
                  <span className="block font-display text-4xl tracking-[0.2em] text-white">{roomCode}</span>
                </span>
              </p>
              {phase === "drawing" && active && (
                <div className={`${BrandStyles.panel} min-w-0 flex-1 py-3`}>
                  <RoomTurnBar
                    title={`${active.name}’s turn`}
                    hint="Watch what they draw"
                    mode={room.settings.mode}
                    msLeft={ClockUtils.left(state.timers.turn, now)}
                    msTotal={state.timers.turn?.totalMs ?? 0}
                  />
                </div>
              )}
              {result && controls && (
                <button type="button" onClick={controls.onSettings} className={BrandStyles.quietButton}>
                  Room settings
                </button>
              )}
              {result && problemLine}
            </footer>

            <div
              ref={sideRef}
              // Reachable by keyboard, as it scrolls when the screen is short.
              tabIndex={0}
              role="group"
              aria-label={result ? "Scores" : "Players"}
              className="min-w-0 rounded-[12px_16px_14px_10px] outline-none focus-visible:outline-3 focus-visible:outline-white lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto"
            >
              {result ? (
                <RoomRoundScores
                  players={players}
                  result={result}
                  totals={RoomViewUtils.totals(room.players)}
                  youId={null}
                  big
                />
              ) : (
                playerList
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
