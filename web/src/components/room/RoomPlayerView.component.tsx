import { useId, useLayoutEffect, useRef, useState } from "react";
import { BrandFooter } from "@/components/brand/BrandFooter.component";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSheet } from "@/components/brand/BrandSheet.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasBoard } from "@/components/canvas/CanvasBoard.component";
import { LobbyHowToPlay } from "@/components/lobby/LobbyHowToPlay.component";
import { CanvasBrushPicker } from "@/components/canvas/CanvasBrushPicker.component";
import { CanvasPalette } from "@/components/canvas/CanvasPalette.component";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { RoomFeed } from "@/components/room/RoomFeed.component";
import { RoomGuess } from "@/components/room/RoomGuess.component";
import { RoomJoinCard } from "@/components/room/RoomJoinCard.component";
import { RoomPenTag } from "@/components/room/RoomPenTag.component";
import { RoomPlayerList, type RoomPlayerAction } from "@/components/room/RoomPlayerList.component";
import { RoomPlayerStrip } from "@/components/room/RoomPlayerStrip.component";
import { RoomPodium } from "@/components/room/RoomPodium.component";
import { RoomProgress } from "@/components/room/RoomProgress.component";
import { RoomResults } from "@/components/room/RoomResults.component";
import { RoomReveal } from "@/components/room/RoomReveal.component";
import { RoomSecretReveal } from "@/components/room/RoomSecretReveal.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import { useRoomView } from "@/components/room/_hooks/roomView.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import { useStrokeSender } from "@/components/room/_hooks/strokeSender.hook";
import type { RoomPlayer, RoomViewState } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { StrokeWireUtils } from "@/components/room/_utils/strokeWire.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";
import { VotePrompt } from "@/components/vote/VotePrompt.component";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import { RoomStateUtils } from "@/protocol/roomState.utils";

type RoomPlayerViewProps = {
  state: RoomViewState;
  send: (message: ClientMessage) => void;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
  /** The host's way back to the room settings, between rounds. */
  onSettings?: () => void;
  /** Where the logo leads. */
  home?: string;
};

/**
 * What a player sees, phase by phase, from the server's state. On a laptop (a `room` container of 64rem or more)
 * everything fits on one screen: the player cards on the left, the canvas sized to the height that's left, the tools
 * under it. On a phone it's one column: everyone as a strip of faces at the top, the canvas, and on your turn the
 * tools pinned to the bottom. The final vote is a sheet over everything, with the drawing in it.
 */
export function RoomPlayerView({ state, send, revealCode = false, onSettings, home = "/" }: RoomPlayerViewProps) {
  const view = useRoomView(state);
  const { room, phase, round, reveal, result, now, players, drawing, active, next, order } = view;
  const sender = useStrokeSender(send);
  const [chosenColour, setChosenColour] = useState(CanvasTools.colours[0]?.value ?? "#000000");
  const [brushSize, setBrushSize] = useState(CanvasTools.brushes[1]?.size ?? 0.014);
  /** Strokes you began this turn: a timed turn takes no more than the server allows. */
  const [turnStrokes, setTurnStrokes] = useState({ turn: 0, count: 0 });
  /** The final round's results are shown first; the podium once you ask for it. */
  const [podiumFor, setPodiumFor] = useState<string | null>(null);
  const spotlight = useSpotlight();
  /** The "?" sheet: this room's rules and how to play. */
  const [infoOpen, setInfoOpen] = useState(false);
  const rulesHeading = useId();
  const toolsRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const you = players.find((player) => player.id === state.you);
  const isHost = !!you && room.hostId === you.id;
  const playing = !!you && !!round?.turnOrder.includes(you.id);
  const yourTurn = playing && active?.id === you?.id;
  const turnKey = RoomViewUtils.turnCount(round);
  const strokesUsedUp =
    room.settings.mode === "timed" &&
    turnStrokes.turn === turnKey &&
    turnStrokes.count >= StrokeWireUtils.limits.strokesPerTimedTurn;
  const youAreBamboozler = round?.role === "bamboozler";
  const bamboozler = players.find((player) => player.id === view.bamboozlerId);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const drawingPhase = phase === "lobby" || phase === "drawing";
  const suspicion = you ? RoomStateUtils.suspicionOf(state, you.id) : null;
  /** The face you tapped last wins over the vote the server confirmed before it. */
  const yourVoteId = state.pendingVote ?? round?.yourVote ?? null;
  const othersHere = players.filter((player) => player.id !== you?.id && player.connected);
  const stillDrawing = phase === "lobby" ? RoomViewUtils.stillOnTheirFace(othersHere) : null;
  const resultKey = result ? `${result.number}/${result.word}` : null;
  const showPodium = view.gameOver && podiumFor === resultKey;

  // Each phase swaps what's on screen. If that took keyboard focus with it (to the page, or into the hidden tools),
  // hand it to what replaced it: the tools while drawing, the cards in the vote, the panel after, or the podium.
  useLayoutEffect(() => {
    // The vote sheet takes the focus itself.
    if (phase === "lobby" || (phase === "voting" && playing)) return;
    const focused = document.activeElement;
    const lost = !focused || focused === document.body || (!drawingPhase && !!toolsRef.current?.contains(focused));
    if (!lost) return;
    const target = showPodium ? podiumRef : phase === "drawing" ? toolsRef : phase === "voting" ? cardsRef : stageRef;
    // On a phone the tools (not your turn) and the cards are hidden: the strip of faces is there instead.
    const shown = target.current && target.current.getClientRects().length > 0 ? target : stripRef;
    shown.current?.focus({ preventScroll: true });
  }, [phase, showPodium, drawingPhase, playing]);

  const startRound = () => send({ type: "startRound" });

  const turnTitle = (player: RoomPlayer) => (player.id === you?.id ? "Your turn" : `${player.name}’s turn`);
  const canvasLabel = active
    ? `Shared drawing. ${active.id === you?.id ? "Your turn to draw." : `${active.name} is drawing.`}`
    : drawingPhase
      ? "Shared drawing. The round hasn't started."
      : "Shared drawing. The drawing is done.";

  const action: RoomPlayerAction | undefined =
    !you || !playing
      ? undefined
      : phase === "drawing"
        ? {
            kind: "suspect",
            chosenId: suspicion,
            onChoose: (id) => {
              send({ type: "suspect", suspectId: id });
              SoundPlayer.play("suspect");
            },
          }
        : phase === "voting" && round
          ? {
              kind: "vote",
              chosenId: yourVoteId,
              suspectedId: suspicion,
              onChoose: (id) => {
                if (id === null || id === yourVoteId) return;
                send({ type: "castVote", suspectId: id });
                SoundPlayer.play("vote");
              },
            }
          : undefined;

  // On a laptop the canvas takes the height the header and whatever sits under it (tools, vote, results) leave over.
  // On a phone: what the header, the strip and (on your turn) the tools bar leave over, when that's the narrower side.
  const phoneCanvasMax = `${yourTurn ? "@max-5xl/room:max-w-[calc((100svh-24rem)*4/3)]" : "@max-5xl/room:max-w-[calc((100svh-17rem)*4/3)]"} sideways:@max-5xl/room:max-w-none`;
  const canvasMax = drawingPhase
    ? "@5xl/room:max-w-[calc((100svh-16.5rem)*4/3)]"
    : phase === "voting"
      ? "@5xl/room:max-w-[calc((100svh-20rem)*4/3)]"
      : phase === "guessing"
        ? "@5xl/room:max-w-[calc((100svh-31rem)*4/3)]"
        : "@5xl/room:max-w-[calc((100svh-24rem)*4/3)]";

  // A lost connection or a turned-down request; also inside the vote sheet, which covers the page.
  const notice = (state.status === "reconnecting" || view.problem) && (
    <p role="alert" className="rounded-full bg-night-soft px-4 py-2 text-center text-sm text-white">
      {state.status === "reconnecting"
        ? "Lost the connection. Getting you back in…"
        : view.problem && RoomViewUtils.problem(view.problem)}
    </p>
  );

  const infoButton = (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => setInfoOpen(true)}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-night-soft/70 font-display text-2xl text-white hover:bg-night-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span aria-hidden="true">?</span>
      <span className="sr-only">How to play</span>
    </button>
  );

  const countdown = phase === "voting" ? state.timers.voting : state.timers.turn;
  const progress = (
    <RoomProgress
      roundNumber={view.roundNumber}
      rounds={view.rounds}
      turn={round?.turn ?? 0}
      turnsPerPlayer={round?.turnsPerPlayer ?? 0}
      phase={phase}
      turnTitle={active ? turnTitle(active) : undefined}
      msLeft={ClockUtils.left(countdown, now)}
      msTotal={countdown?.totalMs ?? 0}
    />
  );

  /** On your turn on a phone the tools are pinned to the bottom: the page leaves room for them. */
  const toolsPinned = phase === "drawing" && yourTurn;

  return (
    <div className="@container/room">
      <div
        className={`mx-auto flex max-w-[110rem] flex-col gap-3 p-3 @5xl/room:h-svh ${toolsPinned ? "pb-[calc(8rem+var(--browser-bar))] @5xl/room:pb-4 sideways:pb-16" : "pb-16"} @5xl/room:gap-4 @5xl/room:px-5 @5xl/room:py-4`}
      >
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 @5xl/room:grid-cols-[1fr_auto_1fr]">
          <BrandLogo
            key={view.roundNumber}
            named
            href={home}
            sly={youAreBamboozler && !result}
            className="size-10"
            nameClassName="sr-only text-sm @5xl/room:not-sr-only"
          />
          {view.category !== null ? (
            <RoomWordCard
              category={view.category}
              word={round?.word ?? result?.word ?? null}
              view={result ? "artist" : youAreBamboozler ? "bamboozler" : playing ? "artist" : "host"}
            />
          ) : (
            <p className="text-center font-display text-xl text-white/80">
              {players.length} {players.length === 1 ? "player" : "players"} in the room
            </p>
          )}
          <div className="flex items-center gap-1.5 justify-self-end">
            <p className="flex flex-col items-end leading-none">
              <span className="text-xs whitespace-nowrap text-white/75">Room code</span>
              <span className="mt-0.5 font-display text-2xl tracking-[0.15em] text-white @5xl/room:text-3xl">
                {room.code}
              </span>
            </p>
            <div className="hidden @5xl/room:block">{infoButton}</div>
            <SoundToggle channel="music" />
            <SoundToggle />
          </div>
        </header>

        {/* The word, or that you're the bamboozler, right in your face as the round starts. */}
        {phase === "drawing" && playing && round && round.turn === 1 && round.activePlayerId === round.turnOrder[0] && (
          // Only during the round's first turn: a reload later in the round doesn't bring it back.
          <RoomSecretReveal
            key={round.number}
            category={round.category}
            word={round.word}
            showMs={yourTurn ? 2_000 : 3_200}
          />
        )}

        {infoOpen && (
          <BrandSheet label="How to play" onClose={() => setInfoOpen(false)}>
            <section aria-labelledby={rulesHeading} className={`${BrandStyles.panel} relative mx-5 grid gap-2 lg:mx-8`}>
              <BrandSketchyFrame className="text-sun/60" />
              <h2 id={rulesHeading} className="font-display text-2xl">
                This room
              </h2>
              <ul className="grid gap-1 text-white/80">
                {RoomViewUtils.rulesOf(room.settings).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <LobbyHowToPlay />
          </BrandSheet>
        )}

        {notice}

        {showPodium ? (
          <div ref={podiumRef} tabIndex={-1} className="outline-none">
            <div className="flex justify-end @5xl/room:hidden">{infoButton}</div>
            <RoomPodium
              players={players}
              totals={RoomViewUtils.totals(room.players)}
              youId={you?.id}
              onNewGame={isHost ? startRound : undefined}
              hostName={view.host?.name}
              startPage={home}
            />
            <BrandFooter support={false} />
          </div>
        ) : (
          // A phone on its side: the drawing on the left at the height there is, everything else beside it.
          <div className="flex min-h-0 flex-1 flex-col gap-3 @5xl/room:grid @5xl/room:grid-cols-[17rem_minmax(0,1fr)] @5xl/room:grid-rows-[minmax(0,1fr)_auto] @5xl/room:gap-x-5 @5xl/room:gap-y-3 sideways:@max-5xl/room:grid sideways:@max-5xl/room:grid-cols-[auto_minmax(14rem,1fr)] sideways:@max-5xl/room:content-start sideways:@max-5xl/room:items-start sideways:@max-5xl/room:*:col-start-2">
            {/* On a phone the "?" sits next to the round, where there's room for it. */}
            <div className="order-first flex items-start gap-2 @5xl/room:hidden">
              <div className="min-w-0 flex-1">{progress}</div>
              {infoButton}
            </div>
            {phase !== "lobby" && (
              <div ref={stripRef} tabIndex={-1} className="order-first outline-none @5xl/room:hidden">
                <RoomPlayerStrip
                  players={players}
                  youId={you?.id ?? null}
                  activeId={active?.id ?? null}
                  totals={RoomViewUtils.totals(room.players)}
                  spotlightId={spotlight.pinned}
                  onSpotlight={spotlight.pin}
                  suspicion={suspicion}
                  onSuspect={action?.kind === "suspect" ? action.onChoose : undefined}
                  youWearTheHat={youAreBamboozler && !result}
                  outcome={RoomViewUtils.outcome(reveal, result, room.players)}
                  suspectedBy={phase === "drawing" ? RoomViewUtils.suspectedBy(round) : {}}
                  votedIds={phase === "voting" ? (round?.voted ?? []) : []}
                />
              </div>
            )}

            {/* The canvas: full width on a phone, as big as the leftover height allows on a laptop. */}
            <div className="order-1 flex min-h-0 justify-center @5xl/room:col-start-2 @5xl/room:row-start-1 @5xl/room:items-end sideways:@max-5xl/room:col-start-1! sideways:@max-5xl/room:row-span-6 sideways:@max-5xl/room:row-start-1 sideways:@max-5xl/room:w-[calc((100svh-5.5rem)*4/3)]">
              <div
                className={`relative w-full rounded-[12px_16px_14px_11px] transition-shadow ${phoneCanvasMax} ${canvasMax} ${
                  yourTurn ? "shadow-[0_0_0_4px_var(--color-sun)]" : ""
                }`}
              >
                <CanvasBoard
                  drawing={drawing}
                  order={order}
                  activePlayerId={yourTurn && you && !strokesUsedUp ? you.id : null}
                  color={chosenColour}
                  brushSize={brushSize}
                  spotlightId={spotlight.shown}
                  label={canvasLabel}
                  onStrokeBegin={(stroke) => {
                    setTurnStrokes((used) => ({ turn: turnKey, count: used.turn === turnKey ? used.count + 1 : 1 }));
                    sender.begin(stroke);
                  }}
                  onStrokeExtend={sender.extend}
                  onStrokeEnd={() => {
                    SoundPlayer.play("scribble");
                    sender.end();
                  }}
                  penTag={active && <RoomPenTag player={active} />}
                >
                  {spotlit && (
                    <BrandSketchyFrame bold className="animate-pop-in text-night motion-reduce:animate-none" />
                  )}
                  {spotlit && (
                    <div className="absolute top-2 left-2">
                      <RoomSpotlightChip
                        player={spotlit}
                        you={spotlit.id === you?.id}
                        onClear={spotlight.pinned === spotlit.id ? () => spotlight.pin(null) : undefined}
                      />
                    </div>
                  )}
                  <div className="absolute right-2 bottom-2 max-w-[70%]">
                    <RoomFeed lines={view.feed} players={players} youId={you?.id} />
                  </div>

                  {active && <RoomTurnCall turn={RoomViewUtils.turnCount(round)} text={turnTitle(active)} />}

                  {phase === "lobby" && (
                    <div className="absolute inset-0 grid place-items-center p-4">
                      <RoomJoinCard roomCode={room.code} reveal={revealCode}>
                        {isHost ? (
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button type="button" onClick={startRound} className={BrandStyles.primaryButton}>
                              Start round
                            </button>
                            {onSettings && (
                              <button type="button" onClick={onSettings} className={BrandStyles.quietButton}>
                                Room settings
                              </button>
                            )}
                            {stillDrawing && (
                              <p className="w-full text-center text-sm text-white/80">
                                <span aria-hidden="true">✏️ </span>
                                {stillDrawing}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-center text-white/80">
                            {room.hostScreen
                              ? `${room.hostScreen} starts the round from the big screen…`
                              : `Waiting for ${view.host?.name ?? "the host"} to start…`}
                          </p>
                        )}
                      </RoomJoinCard>
                    </div>
                  )}
                </CanvasBoard>
              </div>
            </div>

            {/* The players: who drew what, and who you think is sketchy. Bottom-left on a laptop: where we are. */}
            <aside
              ref={cardsRef}
              tabIndex={-1}
              aria-label="Who drew what"
              className={`order-2 flex min-h-0 flex-col gap-3 outline-none @5xl/room:col-start-1 @5xl/room:row-span-2 @5xl/room:row-start-1 @5xl/room:h-[calc(100svh-7.5rem)] ${phase === "lobby" ? "" : "@max-5xl/room:hidden"}`}
            >
              <div className="min-h-0 @5xl/room:flex-1 @5xl/room:overflow-y-auto @5xl/room:pr-1">
                <RoomPlayerList
                  players={players}
                  drawing={drawing}
                  youId={you?.id ?? null}
                  activeId={active?.id ?? null}
                  nextId={next?.id ?? null}
                  spotlightId={spotlight.pinned}
                  onSpotlight={spotlight.pin}
                  onPeek={spotlight.setPeek}
                  action={action}
                  yourVoteId={yourVoteId}
                  suspectedBy={phase === "drawing" ? RoomViewUtils.suspectedBy(round) : {}}
                  votedIds={phase === "voting" ? (round?.voted ?? []) : []}
                  youWearTheHat={youAreBamboozler && !result}
                  outcome={RoomViewUtils.outcome(reveal, result, room.players)}
                  lobby={phase === "lobby"}
                />
              </div>
              <div className="hidden @5xl/room:block">{progress}</div>
            </aside>

            {/* The final call: a sheet over everything, with the drawing and a big Vote button per player. */}
            {phase === "voting" && playing && round && (
              <BrandSheet label="Who’s sketchy?">
                {notice}
                <VotePrompt
                  players={players.filter((player) => round.turnOrder.includes(player.id))}
                  voted={players.find((player) => player.id === yourVoteId)}
                  suspected={players.find((player) => player.id === suspicion)}
                  votedIds={round.voted}
                  msLeft={ClockUtils.left(state.timers.voting, now)}
                />
                <div className="mx-auto w-full max-w-xl">
                  <CanvasBoard
                    drawing={drawing}
                    order={order}
                    activePlayerId={null}
                    color="transparent"
                    brushSize={0}
                    spotlightId={spotlight.shown}
                    label="The finished drawing."
                  />
                </div>
                <RoomPlayerList
                  players={players.filter((player) => round.turnOrder.includes(player.id))}
                  drawing={drawing}
                  youId={you?.id ?? null}
                  activeId={null}
                  nextId={null}
                  spotlightId={spotlight.pinned}
                  onSpotlight={spotlight.pin}
                  onPeek={spotlight.setPeek}
                  action={action}
                  yourVoteId={yourVoteId}
                  votedIds={round.voted}
                  youWearTheHat={youAreBamboozler}
                  layout="sheet"
                />
              </BrandSheet>
            )}

            {/*
              Pens and colours while drawing: under the canvas on a laptop (the canvas shrinks to make room), pinned
              to the bottom on a phone on your turn, so they're always in view.
            */}
            <section
              ref={toolsRef}
              hidden={phase !== "drawing"}
              tabIndex={-1}
              aria-label="Drawing tools"
              className={`${BrandStyles.panel} order-3 flex items-center gap-3 outline-none @5xl/room:col-start-2 @5xl/room:row-start-2 @5xl/room:gap-4 @max-5xl/room:fixed @max-5xl/room:inset-x-0 @max-5xl/room:bottom-0 @max-5xl/room:z-20 @max-5xl/room:rounded-none @max-5xl/room:rounded-t-[18px] @max-5xl/room:bg-night-deep @max-5xl/room:px-3 @max-5xl/room:pt-3 @max-5xl/room:pb-[calc(0.75rem+var(--browser-bar))] @max-5xl/room:shadow-[0_-6px_18px_var(--color-night-deep)] sideways:@max-5xl/room:static sideways:@max-5xl/room:rounded-[14px_18px_16px_12px] sideways:@max-5xl/room:pb-3 sideways:@max-5xl/room:shadow-none ${yourTurn ? "" : "@max-5xl/room:hidden"}`}
            >
              <div className="min-w-0 flex-1">
                <CanvasPalette
                  colours={CanvasTools.colours}
                  value={chosenColour}
                  onChange={setChosenColour}
                  rowWhenNarrow
                />
              </div>
              <CanvasBrushPicker
                brushes={CanvasTools.brushes}
                value={brushSize}
                onChange={setBrushSize}
                color={chosenColour}
              />
            </section>

            {/* After the drawing: the reveal with the guess, then the results, under a smaller canvas. */}
            {(phase === "guessing" || phase === "finished") && (
              <div
                ref={stageRef}
                tabIndex={-1}
                className={`${BrandStyles.panel} order-2 flex flex-col gap-4 outline-none @5xl/room:col-start-2 @5xl/room:row-start-2 @5xl/room:max-h-[24rem] @5xl/room:overflow-y-auto`}
              >
                {reveal && (
                  <>
                    <RoomReveal
                      players={players}
                      bamboozlerId={reveal.bamboozlerId}
                      votes={RoomViewUtils.votes(reveal.votes)}
                      youId={you?.id}
                    />
                    <RoomGuess
                      bamboozlerName={bamboozler?.name ?? "The bamboozler"}
                      yours={youAreBamboozler}
                      msLeft={ClockUtils.left(state.timers.guess, now)}
                      onGuess={(guess) => send({ type: "guessWord", guess })}
                    />
                  </>
                )}
                {result && (
                  <RoomResults
                    players={players}
                    bamboozlerId={result.bamboozlerId}
                    word={result.word}
                    guess={result.guess === null ? null : { text: result.guess, right: result.guessCorrect }}
                    roundNumber={result.number}
                    rounds={result.rounds}
                    youId={you?.id}
                    onNext={
                      result.gameOver
                        ? () => setPodiumFor(resultKey)
                        : isHost
                          ? () => {
                              spotlight.pin(null);
                              startRound();
                            }
                          : undefined
                    }
                  />
                )}
                {result && !result.gameOver && !isHost && (
                  <p className="text-center text-white/70">
                    {room.hostScreen
                      ? `${room.hostScreen} starts the next round from the big screen…`
                      : `Waiting for ${view.host?.name ?? "the host"} to start the next round…`}
                  </p>
                )}
                {result && isHost && onSettings && (
                  <button type="button" onClick={onSettings} className={`${BrandStyles.ghostButton} self-center`}>
                    Room settings
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {active
            ? turnTitle(active)
            : phase === "voting" && playing
              ? "Time’s up! Tap the face of who you think didn’t know the word. You can change it until the vote ends."
              : ""}
        </p>
      </div>
    </div>
  );
}
