import { useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
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
import type { RoomSimulation } from "@/components/room/_hooks/roomSimulation.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";
import { VotePrompt } from "@/components/vote/VotePrompt.component";

type RoomPlayerViewProps = {
  sim: RoomSimulation;
  /** Your seat. */
  youId: string | null;
  roomCode: string;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
};

/**
 * What a player sees, phase by phase. On a laptop (a `room` container of 64rem or more) everything fits on one
 * screen: the player cards on the left, the canvas sized to the height that's left, the tools docked on the right.
 * On a phone it's one column, ordered by the moment: your tools under the canvas on your turn, the cards when you
 * watch or vote.
 */
export function RoomPlayerView({ sim, youId, roomCode, revealCode = false }: RoomPlayerViewProps) {
  const { players, setup, drawing, round, now, word, families, identities, active, next, yourTurn, order } = sim;
  const { phase } = round;
  const [chosenColour, setChosenColour] = useState(CanvasTools.colours[0]?.value ?? "#000000");
  const [brushSize, setBrushSize] = useState(CanvasTools.brushes[1]?.size ?? 0.014);
  /** Your pick in the final vote; until you change it, it's your last suspicion. */
  const [pick, setPick] = useState<{ phaseStartedAt: number; id: string | null } | null>(null);
  const spotlight = useSpotlight();
  const toolsRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);

  const you = players.find((player) => player.id === youId);
  const youAreBamboozler = !!you && round.bamboozlerId === you.id;
  const bamboozler = players.find((player) => player.id === round.bamboozlerId);
  const drawer = yourTurn ? active : you;
  const palette = (families && drawer ? families[drawer.id] : undefined) ?? CanvasTools.colours;
  const colour = palette.some((swatch) => swatch.value === chosenColour)
    ? chosenColour
    : (palette[2]?.value ?? chosenColour);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const drawingPhase = phase === "waiting" || phase === "drawing";
  const suspicion = you ? (round.suspicions[you.id] ?? null) : null;
  const pickedId = pick?.phaseStartedAt === round.phaseStartedAt ? pick.id : suspicion;
  const yourVoteId = you ? (round.votes[you.id] ?? null) : null;

  // Each phase swaps what's on screen. If that took keyboard focus with it (to the page, or into the hidden tools),
  // hand it to what replaced it: the tools while drawing, the cards in the vote, the panel after, or the podium.
  useLayoutEffect(() => {
    if (phase === "waiting") return;
    const focused = document.activeElement;
    const lost = !focused || focused === document.body || (!drawingPhase && !!toolsRef.current?.contains(focused));
    if (!lost) return;
    const target = sim.gameOver ? podiumRef : phase === "drawing" ? toolsRef : phase === "voting" ? cardsRef : stageRef;
    target.current?.focus({ preventScroll: true });
  }, [phase, sim.gameOver, drawingPhase]);

  const start = () => {
    sim.start();
    toolsRef.current?.focus();
  };
  const endTurn = () => {
    sim.endTurn();
    toolsRef.current?.focus();
  };

  const turnTitle = (player: RoomPlayer) => (player.id === you?.id ? "Your turn" : `${player.name}’s turn`);
  const canvasLabel = active
    ? `Shared drawing. ${active.id === you?.id ? "Your turn to draw." : `${active.name} is drawing.`}`
    : drawingPhase
      ? "Shared drawing. The round hasn't started."
      : "Shared drawing. The drawing is done.";

  const action: RoomPlayerAction | undefined =
    !you || yourVoteId
      ? undefined
      : phase === "drawing"
        ? {
            kind: "suspect",
            chosenId: suspicion,
            onChoose: (id) => {
              sim.suspect(you.id, id);
              spotlight.pin(id);
              SoundPlayer.play("suspect");
            },
          }
        : phase === "voting"
          ? {
              kind: "vote",
              chosenId: pickedId,
              onChoose: (id) => {
                setPick({ phaseStartedAt: round.phaseStartedAt, id });
                spotlight.pin(id);
              },
            }
          : undefined;

  const progress = (
    <RoomProgress
      roundNumber={sim.roundNumber}
      rounds={setup.rounds}
      lap={RoundUtils.lap(round, players.length)}
      laps={RoundUtils.lapsFor(setup)}
      phase={phase}
      turnTitle={active ? turnTitle(active) : undefined}
      msLeft={phase === "voting" ? RoundUtils.phaseLeft(round, now) : RoundUtils.turnLeft(round, now)}
      msTotal={phase === "voting" ? RoundUtils.VOTE_MS : round.turnMs}
    />
  );

  // Phone order: canvas first, then what you need right now.
  const placeOnPhone = (section: "tools" | "cards" | "stage") => {
    if (phase === "drawing" && yourTurn) return { tools: "order-2", cards: "order-3", stage: "order-4" }[section];
    if (phase === "drawing") return { tools: "order-3", cards: "order-2", stage: "order-4" }[section];
    if (phase === "voting") return { tools: "order-4", cards: "order-3", stage: "order-4" }[section];
    return { tools: "order-4", cards: "order-3", stage: "order-2" }[section];
  };

  return (
    <div className="@container/room">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-3 p-3 @5xl/room:h-svh @5xl/room:gap-4 @5xl/room:px-5 @5xl/room:py-4">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
          <div className="flex items-center gap-2">
            <BrandLogo href="/?screen=start" className="size-9 @5xl/room:size-11" />
            <div className="hidden leading-tight @2xl/room:block">
              <p className="font-display text-xl">BamDoodle</p>
              <BrandTagline className="hidden text-sm @5xl/room:block" />
            </div>
          </div>
          <RoomWordCard
            category={word.category}
            word={youAreBamboozler ? null : word.word}
            view={youAreBamboozler ? "bamboozler" : "artist"}
          />
          <div className="flex items-center gap-2 justify-self-end">
            <p className="text-right text-xs leading-tight text-white/70">
              <span className="sr-only">Room code </span>
              <span className="font-display text-sm tracking-widest text-white">{roomCode}</span>
            </p>
            <SoundToggle />
          </div>
        </header>

        {sim.gameOver ? (
          <div ref={podiumRef} tabIndex={-1} className="outline-none">
            <RoomPodium
              players={players}
              totals={sim.totals}
              youId={you?.id}
              colours={identities}
              onNewGame={sim.newGame}
            />
          </div>
        ) : (
          <div
            className={`flex min-h-0 flex-1 flex-col gap-3 @5xl/room:grid @5xl/room:gap-5 ${
              drawingPhase
                ? "@5xl/room:grid-cols-[17rem_minmax(0,1fr)_13rem]"
                : phase === "voting"
                  ? "@5xl/room:grid-cols-[17rem_minmax(0,1fr)_17rem]"
                  : "@5xl/room:grid-cols-[17rem_minmax(0,1fr)_24rem]"
            }`}
          >
            <div className="order-first @5xl/room:hidden">{progress}</div>

            {/* The canvas: full width on a phone, as big as the leftover height allows on a laptop. */}
            <div className="order-1 flex min-h-0 justify-center @5xl/room:col-start-2 @5xl/room:row-start-1 @5xl/room:items-start">
              <div
                className={`relative w-full rounded-[12px_16px_14px_11px] transition-shadow @5xl/room:max-w-[calc((100svh-7.5rem)*4/3)] ${
                  you && yourTurn ? "shadow-[0_0_0_4px_var(--color-sun)]" : ""
                }`}
              >
                <CanvasBoard
                  drawing={drawing}
                  order={order}
                  activePlayerId={yourTurn && active ? active.id : null}
                  color={colour}
                  brushSize={brushSize}
                  spotlightId={spotlight.shown}
                  label={canvasLabel}
                  onStrokeEnd={() => {
                    SoundPlayer.play("scribble");
                    sim.strokeFinished(round.turnCount);
                  }}
                  penTag={active && <RoomPenTag player={active} color={identities?.[active.id]} />}
                >
                  {spotlit && (
                    <div className="absolute top-2 left-2">
                      <RoomSpotlightChip
                        player={spotlit}
                        you={spotlit.id === you?.id}
                        onClear={
                          spotlight.pinned
                            ? () => {
                                spotlight.pin(null);
                                cardsRef.current?.focus();
                              }
                            : undefined
                        }
                      />
                    </div>
                  )}
                  <div className="absolute right-2 bottom-2 max-w-[70%]">
                    <RoomFeed lines={sim.feed} players={players} youId={you?.id} />
                  </div>

                  {active && <RoomTurnCall turn={round.turnCount} text={turnTitle(active)} />}

                  {phase === "waiting" && (
                    <div className="absolute inset-0 grid place-items-center p-4">
                      <RoomJoinCard roomCode={roomCode} reveal={revealCode}>
                        <button type="button" onClick={start} className={BrandStyles.primaryButton}>
                          Start round
                        </button>
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
              className={`flex min-h-0 flex-col gap-3 outline-none @5xl/room:col-start-1 @5xl/room:row-start-1 @5xl/room:h-[calc(100svh-7rem)] ${placeOnPhone("cards")}`}
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
                  suspectedBy={RoundUtils.suspectedBy(round)}
                  votedIds={phase === "voting" ? Object.keys(round.votes) : []}
                />
              </div>
              <div className="hidden @5xl/room:block">{progress}</div>
            </aside>

            {/* The final call: right column on a laptop (the cards stay whole on the left), above the cards on a phone. */}
            {phase === "voting" && you && (
              <div className="order-2 @5xl/room:col-start-3 @5xl/room:row-start-1 @5xl/room:self-start">
                <VotePrompt
                  players={players}
                  picked={players.find((player) => player.id === pickedId)}
                  voted={players.find((player) => player.id === yourVoteId)}
                  onLock={(suspectId) => {
                    sim.vote(you.id, suspectId);
                    spotlight.pin(null);
                    SoundPlayer.play("vote");
                  }}
                  votedIds={Object.keys(round.votes)}
                  msLeft={RoundUtils.phaseLeft(round, now)}
                  colours={identities}
                />
              </div>
            )}

            {/* Pens and colours: docked on the right on a laptop, always in view while drawing. */}
            <section
              ref={toolsRef}
              hidden={!drawingPhase}
              tabIndex={-1}
              aria-label="Drawing tools"
              className={`${BrandStyles.panel} flex flex-col gap-4 outline-none @2xl/room:flex-row @2xl/room:items-center @5xl/room:col-start-3 @5xl/room:row-start-1 @5xl/room:flex-col @5xl/room:items-stretch @5xl/room:self-start ${placeOnPhone("tools")}`}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CanvasBrushPicker
                  brushes={CanvasTools.brushes}
                  value={brushSize}
                  onChange={(size) => {
                    setBrushSize(size);
                    SoundPlayer.play("pick");
                  }}
                  color={colour}
                />
                {yourTurn && (
                  <button type="button" onClick={endTurn} className={`${BrandStyles.quietButton} @5xl/room:w-full`}>
                    End turn
                  </button>
                )}
              </div>
            </section>

            {/* After the drawing: the reveal, the guess, the results. Right column on a laptop. */}
            {!drawingPhase && phase !== "voting" && (
              <div
                ref={stageRef}
                tabIndex={-1}
                className={`${BrandStyles.panel} outline-none @5xl/room:col-start-3 @5xl/room:row-start-1 @5xl/room:max-h-[calc(100svh-7rem)] @5xl/room:overflow-y-auto ${placeOnPhone("stage")}`}
              >
                {phase === "reveal" && (
                  <RoomReveal
                    players={players}
                    bamboozlerId={round.bamboozlerId}
                    votes={round.votes}
                    youId={you?.id}
                    colours={identities}
                  />
                )}
                {phase === "guess" && (
                  <RoomGuess
                    bamboozlerName={bamboozler?.name ?? "The bamboozler"}
                    yours={youAreBamboozler}
                    msLeft={RoundUtils.phaseLeft(round, now)}
                    onGuess={sim.guess}
                  />
                )}
                {phase === "results" && sim.roundScores && (
                  <RoomResults
                    players={players}
                    bamboozlerId={round.bamboozlerId}
                    word={word.word}
                    guess={round.guess}
                    scores={sim.roundScores}
                    totals={sim.totals}
                    roundNumber={sim.roundNumber}
                    rounds={setup.rounds}
                    youId={you?.id}
                    colours={identities}
                    onNext={() => {
                      spotlight.pin(null);
                      sim.nextRound();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {active
            ? turnTitle(active)
            : phase === "voting"
              ? "Time’s up! Pick who you think didn’t know the word on their card, then lock in your vote."
              : ""}
        </p>
      </div>
    </div>
  );
}
