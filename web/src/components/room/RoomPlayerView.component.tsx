import { useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasBoard } from "@/components/canvas/CanvasBoard.component";
import { CanvasBrushPicker } from "@/components/canvas/CanvasBrushPicker.component";
import { CanvasPalette } from "@/components/canvas/CanvasPalette.component";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { RoomFeed } from "@/components/room/RoomFeed.component";
import { RoomGuess } from "@/components/room/RoomGuess.component";
import { RoomJoinCard } from "@/components/room/RoomJoinCard.component";
import { RoomPenTag } from "@/components/room/RoomPenTag.component";
import { RoomPlayerList, type RoomPlayerAction } from "@/components/room/RoomPlayerList.component";
import { RoomPodium } from "@/components/room/RoomPodium.component";
import { RoomProgress } from "@/components/room/RoomProgress.component";
import { RoomResults } from "@/components/room/RoomResults.component";
import { RoomReveal } from "@/components/room/RoomReveal.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import { useRoomView } from "@/components/room/_hooks/roomView.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import { useStrokeSender } from "@/components/room/_hooks/strokeSender.hook";
import type { Attribution, RoomPlayer, RoomViewState } from "@/components/room/_types/room.types";
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
  /** Free colours, or a shade family per player (the lab only, until the server has the setting). */
  colours?: Attribution;
  /** The host's way back to the room settings, between rounds. */
  onSettings?: () => void;
  /** Where the logo leads. */
  home?: string;
};

/**
 * What a player sees, phase by phase, from the server's state. On a laptop (a `room` container of 64rem or more)
 * everything fits on one screen: the player cards on the left, the canvas sized to the height that's left, the tools
 * under it. On a phone it's one column, ordered by the moment: your tools under the canvas on your turn, the cards
 * when you watch or vote.
 */
export function RoomPlayerView({
  state,
  send,
  revealCode = false,
  colours = "free",
  onSettings,
  home = "/",
}: RoomPlayerViewProps) {
  const view = useRoomView(state, colours);
  const { room, phase, round, reveal, result, now, players, families, identities, drawing, active, next, order } = view;
  const sender = useStrokeSender(send);
  const [chosenColour, setChosenColour] = useState(CanvasTools.colours[0]?.value ?? "#000000");
  const [brushSize, setBrushSize] = useState(CanvasTools.brushes[1]?.size ?? 0.014);
  /** Your pick in the final vote, per round; until you change it, it's your last suspicion. */
  const [pick, setPick] = useState<{ round: number; id: number | null } | null>(null);
  /** Strokes you began this turn: a timed turn takes no more than the server allows. */
  const [turnStrokes, setTurnStrokes] = useState({ turn: 0, count: 0 });
  /** The final round's results are shown first; the podium once you ask for it. */
  const [podiumFor, setPodiumFor] = useState<string | null>(null);
  const spotlight = useSpotlight();
  const toolsRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);

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
  const palette = (families && you ? families[you.id] : undefined) ?? CanvasTools.colours;
  const colour = palette.some((swatch) => swatch.value === chosenColour)
    ? chosenColour
    : (palette[2]?.value ?? chosenColour);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const drawingPhase = phase === "lobby" || phase === "drawing";
  const suspicion = you ? RoomStateUtils.suspicionOf(state, you.id) : null;
  const pickedId = pick && pick.round === round?.number ? pick.id : suspicion;
  const yourVoteId = round?.yourVote ?? state.pendingVote;
  const resultKey = result ? `${result.number}/${result.word}` : null;
  const showPodium = view.gameOver && podiumFor === resultKey;

  // Each phase swaps what's on screen. If that took keyboard focus with it (to the page, or into the hidden tools),
  // hand it to what replaced it: the tools while drawing, the cards in the vote, the panel after, or the podium.
  useLayoutEffect(() => {
    if (phase === "lobby") return;
    const focused = document.activeElement;
    const lost = !focused || focused === document.body || (!drawingPhase && !!toolsRef.current?.contains(focused));
    if (!lost) return;
    const target = showPodium ? podiumRef : phase === "drawing" ? toolsRef : phase === "voting" ? cardsRef : stageRef;
    target.current?.focus({ preventScroll: true });
  }, [phase, showPodium, drawingPhase]);

  const startRound = () => {
    send({ type: "startRound" });
    toolsRef.current?.focus();
  };

  const turnTitle = (player: RoomPlayer) => (player.id === you?.id ? "Your turn" : `${player.name}’s turn`);
  const canvasLabel = active
    ? `Shared drawing. ${active.id === you?.id ? "Your turn to draw." : `${active.name} is drawing.`}`
    : drawingPhase
      ? "Shared drawing. The round hasn't started."
      : "Shared drawing. The drawing is done.";

  const action: RoomPlayerAction | undefined =
    !you || !playing || yourVoteId !== null
      ? undefined
      : phase === "drawing"
        ? {
            kind: "suspect",
            chosenId: suspicion,
            onChoose: (id) => {
              send({ type: "suspect", suspectId: id });
              spotlight.pin(id);
              SoundPlayer.play("suspect");
            },
          }
        : phase === "voting" && round
          ? {
              kind: "vote",
              chosenId: pickedId,
              onChoose: (id) => {
                setPick({ round: round.number, id });
                spotlight.pin(id);
              },
            }
          : undefined;

  // On a laptop the canvas takes the height the header and whatever sits under it (tools, vote, results) leave over.
  const canvasMax = drawingPhase
    ? "@5xl/room:max-w-[calc((100svh-16.5rem)*4/3)]"
    : phase === "voting"
      ? "@5xl/room:max-w-[calc((100svh-20rem)*4/3)]"
      : "@5xl/room:max-w-[calc((100svh-33rem)*4/3)]";

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

  // Phone order: canvas first, then what you need right now.
  const placeOnPhone = (section: "tools" | "cards" | "stage") => {
    if (phase === "drawing" && yourTurn) return { tools: "order-2", cards: "order-3", stage: "order-4" }[section];
    if (drawingPhase) return { tools: "order-3", cards: "order-2", stage: "order-4" }[section];
    if (phase === "voting") return { tools: "order-4", cards: "order-3", stage: "order-4" }[section];
    return { tools: "order-4", cards: "order-3", stage: "order-2" }[section];
  };

  return (
    <div className="@container/room">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-3 p-3 @5xl/room:h-svh @5xl/room:gap-4 @5xl/room:px-5 @5xl/room:py-4">
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 @5xl/room:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-2">
            <BrandLogo
              key={view.roundNumber}
              href={home}
              sly={youAreBamboozler && !result}
              className="size-9 @5xl/room:size-11"
            />
            <div className="hidden leading-tight @2xl/room:block">
              <p className="font-display text-xl">BamDoodle</p>
              <BrandTagline className="hidden text-sm @5xl/room:block" />
            </div>
          </div>
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
            <SoundToggle channel="music" />
            <SoundToggle />
          </div>
        </header>

        {(state.status === "reconnecting" || view.problem) && (
          <p role="alert" className="rounded-full bg-night-soft px-4 py-2 text-center text-sm text-white">
            {state.status === "reconnecting"
              ? "Lost the connection. Getting you back in…"
              : view.problem && RoomViewUtils.problem(view.problem)}
          </p>
        )}

        {showPodium ? (
          <div ref={podiumRef} tabIndex={-1} className="outline-none">
            <RoomPodium
              players={players}
              totals={RoomViewUtils.totals(room.players)}
              youId={you?.id}
              colours={identities}
              onNewGame={isHost ? startRound : undefined}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 @5xl/room:grid @5xl/room:grid-cols-[17rem_minmax(0,1fr)] @5xl/room:grid-rows-[minmax(0,1fr)_auto] @5xl/room:gap-x-5 @5xl/room:gap-y-3">
            <div className="order-first @5xl/room:hidden">{progress}</div>

            {/* The canvas: full width on a phone, as big as the leftover height allows on a laptop. */}
            <div className="order-1 flex min-h-0 justify-center @5xl/room:col-start-2 @5xl/room:row-start-1 @5xl/room:items-end">
              <div
                className={`relative w-full rounded-[12px_16px_14px_11px] transition-shadow ${canvasMax} ${
                  yourTurn ? "shadow-[0_0_0_4px_var(--color-sun)]" : ""
                }`}
              >
                <CanvasBoard
                  drawing={drawing}
                  order={order}
                  activePlayerId={yourTurn && you && !strokesUsedUp ? you.id : null}
                  color={colour}
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
                  penTag={active && <RoomPenTag player={active} color={identities?.[active.id]} />}
                >
                  {spotlit && (
                    <BrandSketchyFrame bold className="animate-pop-in text-night motion-reduce:animate-none" />
                  )}
                  {spotlit && (
                    <div className="absolute top-2 left-2">
                      <RoomSpotlightChip player={spotlit} you={spotlit.id === you?.id} />
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
                            <a
                              href={`/watch/${room.code}`}
                              target="_blank"
                              rel="noreferrer"
                              className={BrandStyles.ghostButton}
                            >
                              Show on a TV
                            </a>
                          </div>
                        ) : (
                          <p className="text-center text-white/80">
                            Waiting for {view.host?.name ?? "the host"} to start…
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
              className={`flex min-h-0 flex-col gap-3 outline-none @5xl/room:col-start-1 @5xl/room:row-span-2 @5xl/room:row-start-1 @5xl/room:h-[calc(100svh-7.5rem)] ${placeOnPhone("cards")}`}
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
                  colours={identities}
                  suspectedBy={phase === "drawing" ? RoomViewUtils.suspectedBy(round) : {}}
                  votedIds={phase === "voting" ? (round?.voted ?? []) : []}
                  youWearTheHat={youAreBamboozler && !result}
                />
              </div>
              <div className="hidden @5xl/room:block">{progress}</div>
            </aside>

            {/* The final call: under the canvas, next to the cards it refers to; above the cards on a phone. */}
            {phase === "voting" && playing && round && (
              <div className="order-2 @5xl/room:col-start-2 @5xl/room:row-start-2">
                <VotePrompt
                  players={players.filter((player) => round.turnOrder.includes(player.id))}
                  picked={players.find((player) => player.id === pickedId)}
                  voted={players.find((player) => player.id === yourVoteId)}
                  onLock={(suspectId) => {
                    send({ type: "castVote", suspectId });
                    spotlight.pin(null);
                    SoundPlayer.play("vote");
                  }}
                  votedIds={round.voted}
                  msLeft={ClockUtils.left(state.timers.voting, now)}
                  colours={identities}
                />
              </div>
            )}

            {/* Pens and colours: right under the canvas, always in view while drawing (the canvas shrinks to make room). */}
            <section
              ref={toolsRef}
              hidden={!drawingPhase}
              tabIndex={-1}
              aria-label="Drawing tools"
              className={`${BrandStyles.panel} flex flex-col gap-4 outline-none @2xl/room:flex-row @2xl/room:items-center @5xl/room:col-start-2 @5xl/room:row-start-2 ${placeOnPhone("tools")}`}
            >
              <div className="min-w-0 flex-1">
                <CanvasPalette
                  colours={palette}
                  value={colour}
                  onChange={(value) => {
                    setChosenColour(value);
                    SoundPlayer.play("pick");
                  }}
                />
              </div>
              <CanvasBrushPicker
                brushes={CanvasTools.brushes}
                value={brushSize}
                onChange={(size) => {
                  setBrushSize(size);
                  SoundPlayer.play("pick");
                }}
                color={colour}
              />
            </section>

            {/* After the drawing: the reveal with the guess, then the results, under a smaller canvas. */}
            {(phase === "guessing" || phase === "finished") && (
              <div
                ref={stageRef}
                tabIndex={-1}
                className={`${BrandStyles.panel} flex flex-col gap-4 outline-none @5xl/room:col-start-2 @5xl/room:row-start-2 @5xl/room:max-h-[24rem] @5xl/room:overflow-y-auto ${placeOnPhone("stage")}`}
              >
                {reveal && (
                  <>
                    <RoomReveal
                      players={players}
                      bamboozlerId={reveal.bamboozlerId}
                      votes={RoomViewUtils.votes(reveal.votes)}
                      youId={you?.id}
                      colours={identities}
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
                    scores={RoomViewUtils.roundScores(result)}
                    totals={RoomViewUtils.totals(room.players)}
                    roundNumber={result.number}
                    rounds={result.rounds}
                    youId={you?.id}
                    colours={identities}
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
                    Waiting for {view.host?.name ?? "the host"} to start the next round…
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
              ? "Time’s up! Pick who you think didn’t know the word on their card, then lock in your vote."
              : ""}
        </p>
      </div>
    </div>
  );
}
