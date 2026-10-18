import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { CanvasBoard } from "@/components/canvas/CanvasBoard.component";
import { CanvasBrushPicker } from "@/components/canvas/CanvasBrushPicker.component";
import { CanvasPalette } from "@/components/canvas/CanvasPalette.component";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";
import { RoomOptionGroup, type RoomOption } from "@/components/room/RoomOptionGroup.component";
import { RoomPlayerList } from "@/components/room/RoomPlayerList.component";
import { RoomRoundClock } from "@/components/room/RoomRoundClock.component";
import { RoomTurnBar } from "@/components/room/RoomTurnBar.component";
import { RoomWordCard } from "@/components/room/RoomWordCard.component";
import { useBotTurn } from "@/components/room/_hooks/botTurn.hook";
import { useTicker } from "@/components/room/_hooks/ticker.hook";
import type { DeviceMode, RoomPlayer, TurnMode } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

type RoomPlaygroundProps = {
  players: RoomPlayer[];
  /** The player at this screen; the others are simulated when everyone is on their own device. */
  youId: string;
  words: { category: string; word: string }[];
  initialMode?: TurnMode;
  initialDevices?: DeviceMode;
};

const turnOptions: RoomOption<TurnMode>[] = [
  {
    value: "classic",
    name: "Classic",
    description: `One stroke per turn, ${RoundUtils.turnLength("classic") / 1000} seconds to make it`,
  },
  {
    value: "timed",
    name: "Timed",
    description: `${RoundUtils.turnLength("timed") / 1000} seconds of free drawing per turn`,
  },
];

const deviceOptions: RoomOption<DeviceMode>[] = [
  { value: "own", name: "Own devices", description: "Everyone plays on their own laptop or computer" },
  { value: "shared", name: "One device", description: "Pass a tablet round, or share a big screen" },
];

const buttonClass =
  "rounded-[12px_16px_14px_10px] px-5 py-2.5 font-display text-lg font-bold transition-transform focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white active:translate-y-0.5";
const primaryButton = `${buttonClass} bg-sun text-night shadow-[0_4px_0_var(--color-amber),0_6px_0_var(--color-night-deep)] hover:-translate-y-0.5`;
const quietButton = `${buttonClass} bg-night-soft text-white hover:bg-iris/40`;

/**
 * Prototype of a round without a server, to try free colours with mini-maps and the spotlight as the way to tell who
 * drew what. With own devices you play one seat and the others are simulated; with one device you draw every turn.
 */
export function RoomPlayground({
  players,
  youId,
  words,
  initialMode = "classic",
  initialDevices = "own",
}: RoomPlaygroundProps) {
  const [drawing] = useState(DrawingUtils.createDrawing);
  const [round, setRound] = useState(() => RoundUtils.create(initialMode));
  const [devices, setDevices] = useState(initialDevices);
  const [wordIndex, setWordIndex] = useState(0);
  const [color, setColor] = useState(CanvasTools.colours[0]?.value ?? "#000000");
  const [brushSize, setBrushSize] = useState(CanvasTools.brushes[1]?.size ?? 0.014);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const toolsRef = useRef<HTMLElement>(null);
  const playersRef = useRef<HTMLElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const focusStart = useRef(false);
  const order = useMemo(() => players.map((player) => player.id), [players]);

  const drawingNow = round.phase === "drawing";
  const activeIndex = RoundUtils.activeIndex(round, players.length);
  const active = drawingNow ? players[activeIndex] : undefined;
  const next = drawingNow ? players[(activeIndex + 1) % players.length] : undefined;
  const ownDevices = devices === "own";
  const you = ownDevices ? players.find((player) => player.id === youId) : undefined;
  const yourTurn = !!active && (!ownDevices || active.id === youId);
  const shownSpotlight = peekId ?? spotlightId;
  const spotlit = players.find((player) => player.id === shownSpotlight);
  const word = words[wordIndex % words.length] ?? { category: "Things", word: "Umbrella" };

  const strokeFinished = (turnCount: number) =>
    setRound((current) => RoundUtils.strokeFinished(current, turnCount, Date.now()));

  useTicker(drawingNow, (time) => {
    setNow(time);
    setRound((current) => RoundUtils.tick(current, time));
  });

  useBotTurn(drawing, round, active && !yourTurn ? active.id : null, strokeFinished);

  useEffect(() => {
    if (!spotlightId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSpotlightId(null);
      setPeekId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spotlightId]);

  useEffect(() => {
    if (round.phase !== "waiting" || !focusStart.current) return;
    focusStart.current = false;
    startRef.current?.focus();
  }, [round.phase]);

  // The buttons below disappear once used; keep keyboard focus nearby instead of dropping it to the page.
  const start = () => {
    const time = Date.now();
    setNow(time);
    setRound((current) => RoundUtils.start(current, time));
    toolsRef.current?.focus();
  };
  const endTurn = () => {
    const time = Date.now();
    setNow(time);
    setRound((current) => RoundUtils.endTurn(current, round.turnCount, time));
    toolsRef.current?.focus();
  };
  const newRound = () => {
    focusStart.current = true;
    drawing.clear();
    setSpotlightId(null);
    setWordIndex((index) => index + 1);
    setRound((current) => RoundUtils.create(current.mode));
  };

  const turnName = (player: RoomPlayer) => (player.id === you?.id ? "Your turn" : `${player.name}’s turn`);
  const canvasLabel = active
    ? `Shared drawing. ${active.id === you?.id ? "Your turn to draw." : `${active.name} is drawing.`}`
    : round.phase === "over"
      ? "Shared drawing. The round is over."
      : "Shared drawing. The round hasn't started.";

  return (
    <div className="mx-auto flex min-h-svh max-w-[90rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-5">
      <header className="grid grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3">
          <BrandLogo className="size-11 sm:size-12" />
          <div className="leading-tight">
            <h1 className="font-display text-2xl font-extrabold">BamDoodle</h1>
            <p className="text-sm text-white/70">
              Draw <span className="text-berry">•</span> Guess <span className="text-berry">•</span> Deceive
            </p>
          </div>
        </div>
        <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
          <RoomWordCard category={word.category} word={word.word} />
        </div>
        <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3">
          <RoomRoundClock msLeft={RoundUtils.roundLeft(round, now)} />
        </div>
      </header>

      <main className="grid flex-1 items-start gap-4 lg:grid-cols-[18rem_minmax(0,calc((100svh-15.5rem)*4/3))] lg:justify-center lg:gap-8">
        <section ref={playersRef} tabIndex={-1} aria-label="Players" className="outline-none lg:pt-1">
          <RoomPlayerList
            players={players}
            drawing={drawing}
            youId={you?.id ?? null}
            activeId={active?.id ?? null}
            nextId={next?.id ?? null}
            spotlightId={spotlightId}
            onSpotlight={setSpotlightId}
            onPeek={setPeekId}
          />
        </section>

        <div className="flex w-full flex-col gap-4">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-1 translate-y-2 rotate-[1.2deg] rounded-[12px] bg-paper/15"
            />
            <div
              className={`relative rounded-[12px_16px_14px_11px] transition-shadow ${
                ownDevices && yourTurn ? "shadow-[0_0_0_4px_var(--color-sun)]" : ""
              }`}
            >
              <CanvasBoard
                drawing={drawing}
                order={order}
                activePlayerId={yourTurn && active ? active.id : null}
                color={color}
                brushSize={brushSize}
                spotlightId={shownSpotlight}
                label={canvasLabel}
                onStrokeEnd={() => strokeFinished(round.turnCount)}
                penTag={
                  active && (
                    <span className="flex items-center gap-1.5 rounded-full bg-night py-0.5 pr-3 pl-0.5 font-display text-sm font-bold whitespace-nowrap text-white shadow-[0_2px_0_var(--color-sun)]">
                      <AvatarDoodle seed={active.avatarSeed} className="size-6" />
                      {active.name}
                    </span>
                  )
                }
              >
                {spotlit && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-night py-1 pr-1 pl-2 text-white shadow-[0_3px_0_var(--color-night-deep)]">
                    <BrandScribble shape="magnifier" seed={spotlit.avatarSeed} className="size-6" />
                    <span className="pr-2 font-display font-bold">
                      {spotlit.id === you?.id ? "Your lines" : `${spotlit.name}’s lines`}
                    </span>
                    {spotlightId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSpotlightId(null);
                          playersRef.current?.focus();
                        }}
                        className="rounded-full bg-night-soft px-3 py-1 text-sm hover:bg-iris/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
                      >
                        Show everyone <span className="text-white/60">(Esc)</span>
                      </button>
                    )}
                  </div>
                )}

                {active && (
                  <p
                    key={round.turnCount}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-[38%] text-center font-display text-5xl font-extrabold text-night opacity-0 [text-shadow:0_0_4px_var(--color-paper),0_0_12px_var(--color-paper)] animate-turn-call motion-reduce:hidden sm:text-6xl"
                  >
                    {turnName(active)}
                  </p>
                )}

                {round.phase === "waiting" && (
                  <div className="absolute inset-0 grid place-items-center overflow-y-auto p-4">
                    <div className="w-full max-w-lg rounded-[18px_24px_20px_16px] bg-night p-5 text-left shadow-[0_6px_0_var(--color-night-deep)] sm:p-6">
                      <h2 className="font-display text-3xl font-extrabold">Ready to doodle?</h2>
                      <p className="mt-2 text-white/80">
                        {you
                          ? `You’re ${you.name}. The others are pretend players on their own laptops: watch their lines appear, and draw yours on your turns.`
                          : `One device, ${players.length} players: pass it round and draw on everyone’s turn.`}{" "}
                        Any colour, any time. Click a player to see which lines are theirs.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <RoomOptionGroup
                          legend="Devices"
                          name="devices"
                          options={deviceOptions}
                          value={devices}
                          onChange={setDevices}
                        />
                        <RoomOptionGroup
                          legend="Turns"
                          name="turn-mode"
                          options={turnOptions}
                          value={round.mode}
                          onChange={(mode) => setRound((current) => RoundUtils.setMode(current, mode))}
                        />
                      </div>
                      <button ref={startRef} type="button" onClick={start} className={`${primaryButton} mt-5 w-full`}>
                        Start round
                      </button>
                    </div>
                  </div>
                )}
              </CanvasBoard>
            </div>
          </div>

          <section
            ref={toolsRef}
            tabIndex={-1}
            aria-label="Drawing tools"
            className="grid items-center gap-4 rounded-[16px_20px_18px_14px] bg-night-deep/60 p-3 outline-none sm:p-4 md:grid-cols-[minmax(12rem,1fr)_auto_auto]"
          >
            <div className="min-w-0">
              {active ? (
                <RoomTurnBar
                  title={turnName(active)}
                  hint={yourTurn ? undefined : "Watch what they draw"}
                  mode={round.mode}
                  msLeft={RoundUtils.turnLeft(round, now)}
                  msTotal={RoundUtils.turnLength(round.mode)}
                />
              ) : round.phase === "over" ? (
                <div>
                  <p className="font-display text-xl font-bold text-sun">Time’s up</p>
                  <p className="text-sm text-white/70">Who drew what? Click a player to look closer.</p>
                </div>
              ) : (
                <p className="text-sm text-white/70">Pick a colour now if you like; it stays until you change it.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="w-[17rem] sm:w-[19rem]">
                <CanvasPalette
                  colours={CanvasTools.colours}
                  value={color}
                  onChange={setColor}
                  disabled={round.phase === "over"}
                />
              </div>
              <CanvasBrushPicker
                brushes={CanvasTools.brushes}
                value={brushSize}
                onChange={setBrushSize}
                color={color}
                disabled={round.phase === "over"}
              />
            </div>
            <div className="flex justify-end">
              {yourTurn && (
                <button type="button" onClick={endTurn} className={quietButton}>
                  End turn
                </button>
              )}
              {round.phase === "over" && (
                <button type="button" onClick={newRound} className={primaryButton}>
                  New round
                </button>
              )}
            </div>
          </section>
        </div>
      </main>

      <p className="sr-only" aria-live="polite">
        {active ? turnName(active) : round.phase === "over" ? "Time’s up" : ""}
      </p>
    </div>
  );
}
