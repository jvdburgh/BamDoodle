import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { CanvasBoard, type CanvasSurface } from "@/components/canvas/CanvasBoard.component";
import { CanvasBrushPicker } from "@/components/canvas/CanvasBrushPicker.component";
import { CanvasPalette } from "@/components/canvas/CanvasPalette.component";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { RoomJoinCard } from "@/components/room/RoomJoinCard.component";
import { RoomPenTag } from "@/components/room/RoomPenTag.component";
import { RoomPlayerList } from "@/components/room/RoomPlayerList.component";
import { RoomRoundClock } from "@/components/room/RoomRoundClock.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnBar } from "@/components/room/RoomTurnBar.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import type { RoomSimulation } from "@/components/room/_hooks/roomSimulation.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { VoteBallot } from "@/components/vote/VoteBallot.component";
import type { Role } from "@/protocol/generated/Role";

type RoomPlayerViewProps = {
  sim: RoomSimulation;
  /** Your seat; null when the device is passed round and draws every turn. */
  youId: string | null;
  role: Role;
  roomCode: string;
  surface?: CanvasSurface;
};

/**
 * What a player sees on their own phone: everything they need, in one column. In a wide `room` container (tablet,
 * desktop) the players move to a rail beside the canvas.
 */
export function RoomPlayerView({ sim, youId, role, roomCode, surface = "paper" }: RoomPlayerViewProps) {
  const { players, drawing, round, now, word, families, identities, active, next, yourTurn, order } = sim;
  const [chosenColour, setChosenColour] = useState(CanvasTools.colours[0]?.value ?? "#000000");
  const [brushSize, setBrushSize] = useState(CanvasTools.brushes[1]?.size ?? 0.014);
  const spotlight = useSpotlight();
  const toolsRef = useRef<HTMLElement>(null);
  const playersRef = useRef<HTMLElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const focusStart = useRef(false);

  const you = players.find((player) => player.id === youId);
  const drawer = yourTurn ? active : you;
  const palette = (families && drawer ? families[drawer.id] : undefined) ?? CanvasTools.colours;
  const colour = palette.some((swatch) => swatch.value === chosenColour)
    ? chosenColour
    : (palette[2]?.value ?? chosenColour);
  const spotlit = players.find((player) => player.id === spotlight.shown);
  const yourVote = you ? (sim.votes[you.id] ?? null) : null;

  useEffect(() => {
    if (round.phase !== "waiting" || !focusStart.current) return;
    focusStart.current = false;
    startRef.current?.focus();
  }, [round.phase]);

  // These buttons disappear once used; keep keyboard focus nearby instead of dropping it to the page.
  const start = () => {
    sim.start();
    toolsRef.current?.focus();
  };
  const endTurn = () => {
    sim.endTurn();
    toolsRef.current?.focus();
  };
  const newRound = () => {
    focusStart.current = true;
    spotlight.pin(null);
    sim.newRound();
  };

  const turnTitle = (player: RoomPlayer) => (player.id === you?.id ? "Your turn" : `${player.name}’s turn`);
  const canvasLabel = active
    ? `Shared drawing. ${active.id === you?.id ? "Your turn to draw." : `${active.name} is drawing.`}`
    : round.phase === "over"
      ? "Shared drawing. The round is over."
      : "Shared drawing. The round hasn't started.";

  const ballot = you && round.phase !== "waiting" && (
    <VoteBallot
      candidates={players.filter((player) => player.id !== you.id)}
      vote={yourVote}
      onVote={(playerId) => sim.vote(you.id, playerId)}
    />
  );

  return (
    <div className="@container/room">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-3 p-3 @4xl/room:gap-5 @4xl/room:p-6">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
          <div className="flex items-center gap-2">
            <BrandLogo href="/?screen=start" className="size-9 @4xl/room:size-12" />
            <div className="hidden leading-tight @2xl/room:block">
              <p className="font-display text-xl @4xl/room:text-2xl">BamDoodle</p>
              <BrandTagline className="hidden text-sm @4xl/room:block" />
            </div>
          </div>
          <div>
            <RoomWordCard category={word.category} word={role === "artist" ? word.word : null} view={role} />
          </div>
          <div className="flex flex-col items-end gap-1 justify-self-end">
            <RoomRoundClock msLeft={RoundUtils.roundLeft(round, now)} />
            <p className="rounded-full bg-night-soft px-2 py-0.5 text-xs text-white/80">
              <span className="sr-only">Room code </span>
              <span aria-hidden="true">Room </span>
              <span className="font-display tracking-widest">{roomCode}</span>
            </p>
          </div>
        </header>

        <div className="grid gap-3 @4xl/room:grid-cols-[16rem_minmax(0,1fr)] @4xl/room:items-start @4xl/room:gap-6">
          <aside ref={playersRef} tabIndex={-1} aria-label="Players" className="flex flex-col gap-3 outline-none">
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
              surface={surface}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-3 @4xl/room:mx-auto @4xl/room:w-full @4xl/room:max-w-[calc((100svh-16rem)*4/3)]">
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
                surface={surface}
                label={canvasLabel}
                onStrokeEnd={() => sim.strokeFinished(round.turnCount)}
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

                {active && <RoomTurnCall turn={round.turnCount} text={turnTitle(active)} surface={surface} />}

                {round.phase === "waiting" && (
                  <div className="absolute inset-0 grid place-items-center p-4">
                    <RoomJoinCard roomCode={roomCode}>
                      <button ref={startRef} type="button" onClick={start} className={BrandStyles.primaryButton}>
                        Start round
                      </button>
                    </RoomJoinCard>
                  </div>
                )}
              </CanvasBoard>
            </div>

            {round.phase !== "waiting" && (
              <section aria-label="Turn" className={BrandStyles.panel}>
                {active ? (
                  <RoomTurnBar
                    title={turnTitle(active)}
                    hint={yourTurn ? undefined : "Watch what they draw"}
                    mode={round.mode}
                    msLeft={RoundUtils.turnLeft(round, now)}
                    msTotal={RoundUtils.turnLength(round.mode)}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-2xl text-sun">Time’s up. Who’s sketchy?</p>
                    <button type="button" onClick={newRound} className={BrandStyles.primaryButton}>
                      New round
                    </button>
                  </div>
                )}
              </section>
            )}

            <section
              ref={toolsRef}
              tabIndex={-1}
              aria-label="Drawing tools"
              className={`${BrandStyles.panel} flex flex-col gap-3 outline-none @2xl/room:flex-row @2xl/room:items-center`}
            >
              <div className="min-w-0 flex-1">
                <CanvasPalette
                  colours={palette}
                  value={colour}
                  onChange={setChosenColour}
                  disabled={round.phase === "over"}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <CanvasBrushPicker
                  brushes={CanvasTools.brushes}
                  value={brushSize}
                  onChange={setBrushSize}
                  color={colour}
                  disabled={round.phase === "over"}
                />
                {yourTurn && (
                  <button type="button" onClick={endTurn} className={BrandStyles.quietButton}>
                    End turn
                  </button>
                )}
              </div>
            </section>

            {ballot}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {active ? turnTitle(active) : round.phase === "over" ? "Time’s up" : ""}
        </p>
      </div>
    </div>
  );
}
