import { useRef } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { CanvasBoard, type CanvasSurface } from "@/components/canvas/CanvasBoard.component";
import { JOIN_AT, RoomJoinCard } from "@/components/room/RoomJoinCard.component";
import { RoomPenTag } from "@/components/room/RoomPenTag.component";
import { RoomPlayerList } from "@/components/room/RoomPlayerList.component";
import { RoomRoundClock } from "@/components/room/RoomRoundClock.component";
import { RoomSpotlightChip } from "@/components/room/RoomSpotlightChip.component";
import { RoomTurnBar } from "@/components/room/RoomTurnBar.component";
import { RoomTurnCall } from "@/components/room/RoomTurnCall.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import type { RoomSimulation } from "@/components/room/_hooks/roomSimulation.hook";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

type RoomHostViewProps = {
  sim: RoomSimulation;
  roomCode: string;
  surface?: CanvasSurface;
};

/**
 * The optional big screen (TV, beamer, laptop): the canvas large, everyone's mini-maps, the clocks. It never gets the
 * word and nobody draws on it.
 */
export function RoomHostView({ sim, roomCode, surface = "paper" }: RoomHostViewProps) {
  const { players, drawing, round, now, word, identities, active, next, order } = sim;
  const spotlight = useSpotlight();
  const playersRef = useRef<HTMLDivElement>(null);
  const spotlit = players.find((player) => player.id === spotlight.shown);

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
          <div className="col-start-2 row-start-1 justify-self-end @4xl/room:col-start-3">
            <RoomRoundClock msLeft={RoundUtils.roundLeft(round, now)} />
          </div>
        </header>

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
              surface={surface}
              layout="row"
            />
          </div>

          <div className="mx-auto flex w-full min-w-0 flex-col gap-4 @4xl/room:max-w-[calc((100svh-31rem)*4/3)] @4xl/room:min-w-[36rem]">
            <CanvasBoard
              drawing={drawing}
              order={order}
              activePlayerId={null}
              color="transparent"
              brushSize={0}
              spotlightId={spotlight.shown}
              surface={surface}
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
              {active && <RoomTurnCall turn={round.turnCount} text={`${active.name}’s turn`} surface={surface} big />}
              {round.phase === "waiting" && (
                <div className="absolute inset-0 grid place-items-center p-4">
                  <RoomJoinCard roomCode={roomCode} big>
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

            {round.phase !== "waiting" && (
              <div className={BrandStyles.panel}>
                {active ? (
                  <RoomTurnBar
                    title={`${active.name}’s turn`}
                    hint="Watch what they draw"
                    mode={round.mode}
                    msLeft={RoundUtils.turnLeft(round, now)}
                    msTotal={RoundUtils.turnLength(round.mode)}
                  />
                ) : (
                  <p className="font-display text-3xl text-sun">Time’s up. Who’s sketchy?</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {round.phase !== "waiting" && (
        <p className="absolute bottom-4 left-4 flex items-baseline gap-2 rounded-[12px_16px_14px_10px] bg-night-deep px-4 py-2 text-white/80 @4xl/room:bottom-6 @4xl/room:left-8">
          Join at <span className="font-semibold text-white">{JOIN_AT}</span>
          <span className="sr-only">with room code</span>
          <span className="font-display text-3xl tracking-[0.2em] text-white">{roomCode}</span>
        </p>
      )}
    </div>
  );
}
