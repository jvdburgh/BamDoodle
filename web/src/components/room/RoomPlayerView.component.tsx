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
import { RoomPlayerList } from "@/components/room/RoomPlayerList.component";
import { RoomPodium } from "@/components/room/RoomPodium.component";
import { RoomResults } from "@/components/room/RoomResults.component";
import { RoomReveal } from "@/components/room/RoomReveal.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnBar } from "@/components/room/RoomTurnBar.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import type { RoomSimulation } from "@/components/room/_hooks/roomSimulation.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";
import { VoteBallot } from "@/components/vote/VoteBallot.component";

type RoomPlayerViewProps = {
  sim: RoomSimulation;
  /** Your seat; null when the device is passed round and draws every turn. */
  youId: string | null;
  roomCode: string;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
};

/**
 * What a player sees on their own phone: everything they need, in one column, phase by phase. In a wide `room`
 * container (tablet, desktop) the players move to a rail beside the canvas.
 */
export function RoomPlayerView({ sim, youId, roomCode, revealCode = false }: RoomPlayerViewProps) {
  const { players, setup, drawing, round, now, word, families, identities, active, next, yourTurn, order } = sim;
  const { phase } = round;
  const [chosenColour, setChosenColour] = useState(CanvasTools.colours[0]?.value ?? "#000000");
  const [brushSize, setBrushSize] = useState(CanvasTools.brushes[1]?.size ?? 0.014);
  const spotlight = useSpotlight();
  const toolsRef = useRef<HTMLElement>(null);
  const playersRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
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
  const afterDrawing = phase !== "waiting" && phase !== "drawing";

  // Each phase swaps what's on screen. If that took keyboard focus with it (to the page, or into the hidden tools),
  // hand it to what replaced it: the tools while drawing, the vote/reveal/guess/results panel, or the podium.
  useLayoutEffect(() => {
    if (phase === "waiting") return;
    const focused = document.activeElement;
    const lost =
      !focused || focused === document.body || (phase !== "drawing" && !!toolsRef.current?.contains(focused));
    if (!lost) return;
    const target = sim.gameOver ? podiumRef : phase === "drawing" ? toolsRef : stageRef;
    target.current?.focus({ preventScroll: true });
  }, [phase, sim.gameOver]);

  // These buttons disappear once used; keep keyboard focus nearby instead of dropping it to the page.
  const start = () => {
    sim.start();
    toolsRef.current?.focus();
  };
  const endTurn = () => {
    sim.endTurn();
    toolsRef.current?.focus();
  };
  const nextRound = () => {
    spotlight.pin(null);
    sim.nextRound();
  };

  const turnTitle = (player: RoomPlayer) => (player.id === you?.id ? "Your turn" : `${player.name}’s turn`);
  const canvasLabel = active
    ? `Shared drawing. ${active.id === you?.id ? "Your turn to draw." : `${active.name} is drawing.`}`
    : afterDrawing
      ? "Shared drawing. The drawing is done."
      : "Shared drawing. The round hasn't started.";

  const ballot = you && (phase === "drawing" || phase === "voting") && (
    <VoteBallot
      key={phase}
      mode={phase === "voting" ? "final" : "suspect"}
      candidates={players.filter((player) => player.id !== you.id)}
      players={players}
      drawing={drawing}
      suspicion={round.suspicions[you.id] ?? null}
      vote={round.votes[you.id] ?? null}
      onSuspect={(suspectId) => {
        sim.suspect(you.id, suspectId);
        SoundPlayer.play("suspect");
      }}
      onVote={(suspectId) => {
        sim.vote(you.id, suspectId);
        SoundPlayer.play("vote");
      }}
      onConsider={spotlight.pin}
      votedIds={Object.keys(round.votes)}
      msLeft={RoundUtils.phaseLeft(round, now)}
      colours={identities}
    />
  );
  // Pinned to the bottom of a phone while you watch and during the final vote, never over your own tools.
  const pinBallot = phase === "voting" || (phase === "drawing" && !yourTurn);

  return (
    <div className="@container/room">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-4 p-4 @4xl/room:gap-6 @4xl/room:p-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
          <div className="flex items-center gap-2">
            <BrandLogo href="/?screen=start" className="size-9 @4xl/room:size-12" />
            <div className="hidden leading-tight @2xl/room:block">
              <p className="font-display text-xl @4xl/room:text-2xl">BamDoodle</p>
              <BrandTagline className="hidden text-sm @4xl/room:block" />
            </div>
          </div>
          <RoomWordCard
            category={word.category}
            word={youAreBamboozler ? null : word.word}
            view={youAreBamboozler ? "bamboozler" : "artist"}
          />
          <div className="flex items-center gap-2 justify-self-end">
            <div className="text-right text-xs leading-tight text-white/75">
              <p>
                Round <span className="font-display text-base text-white">{sim.roundNumber}</span>/{setup.rounds}
              </p>
              {phase === "drawing" && (
                <p>
                  Lap <span className="font-display text-base text-white">{RoundUtils.lap(round, players.length)}</span>
                  /{RoundUtils.lapsFor(setup)}
                </p>
              )}
              <p>
                <span className="sr-only">Room code </span>
                <span className="font-display tracking-widest text-white">{roomCode}</span>
              </p>
            </div>
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
          <div className="grid gap-4 @4xl/room:grid-cols-[16rem_minmax(0,1fr)] @4xl/room:items-start @4xl/room:gap-6">
            <aside
              ref={playersRef}
              tabIndex={-1}
              aria-label="Players"
              className={`flex-col gap-4 outline-none @4xl/room:flex ${afterDrawing ? "hidden" : "flex"}`}
            >
              <RoomPlayerList
                players={players}
                drawing={drawing}
                youId={you?.id ?? null}
                activeId={active?.id ?? null}
                nextId={next?.id ?? null}
                spotlightId={spotlight.pinned}
                onSpotlight={spotlight.pin}
                onPeek={spotlight.setPeek}
                colours={identities}
                suspectedBy={RoundUtils.suspectedBy(round)}
              />
            </aside>

            <div className="flex min-w-0 flex-col gap-4 @4xl/room:mx-auto @4xl/room:w-full @4xl/room:max-w-[calc((100svh-16rem)*4/3)]">
              <div
                className={`relative rounded-[12px_16px_14px_11px] transition-shadow ${you && yourTurn ? "shadow-[0_0_0_4px_var(--color-sun)]" : ""}`}
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
                                playersRef.current?.focus();
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
                        <button ref={startRef} type="button" onClick={start} className={BrandStyles.primaryButton}>
                          Start round
                        </button>
                      </RoomJoinCard>
                    </div>
                  )}
                </CanvasBoard>
              </div>

              {phase === "drawing" && active && (
                <section aria-label="Turn" className={BrandStyles.panel}>
                  <RoomTurnBar
                    title={turnTitle(active)}
                    hint={yourTurn ? undefined : "Watch what they draw"}
                    mode={round.mode}
                    msLeft={RoundUtils.turnLeft(round, now)}
                    msTotal={round.turnMs}
                  />
                </section>
              )}

              <section
                ref={toolsRef}
                hidden={afterDrawing}
                tabIndex={-1}
                aria-label="Drawing tools"
                className={`${BrandStyles.panel} flex flex-col gap-4 outline-none @2xl/room:flex-row @2xl/room:items-center`}
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
                <div className="flex items-center justify-between gap-3">
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
                    <button type="button" onClick={endTurn} className={BrandStyles.quietButton}>
                      End turn
                    </button>
                  )}
                </div>
              </section>

              <div
                ref={stageRef}
                tabIndex={-1}
                className={`outline-none ${
                  pinBallot
                    ? "sticky bottom-2 z-10 shadow-[0_-8px_24px_var(--color-night)] @4xl/room:static @4xl/room:shadow-none"
                    : ""
                }`}
              >
                {ballot}
                {phase === "reveal" && (
                  <div className={BrandStyles.panel}>
                    <RoomReveal
                      players={players}
                      bamboozlerId={round.bamboozlerId}
                      votes={round.votes}
                      youId={you?.id}
                      colours={identities}
                    />
                  </div>
                )}
                {phase === "guess" && (
                  <div className={BrandStyles.panel}>
                    <RoomGuess
                      bamboozlerName={bamboozler?.name ?? "The bamboozler"}
                      yours={youAreBamboozler}
                      msLeft={RoundUtils.phaseLeft(round, now)}
                      onGuess={sim.guess}
                    />
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
                      youId={you?.id}
                      colours={identities}
                      onNext={nextRound}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {active
            ? turnTitle(active)
            : phase === "voting"
              ? "Time’s up! Vote for who you think didn’t know the word."
              : ""}
        </p>
      </div>
    </div>
  );
}
