import { useMemo, useState } from "react";
import { CanvasTools, type CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";
import { useBotTurn } from "@/components/room/_hooks/botTurn.hook";
import { useTicker } from "@/components/room/_hooks/ticker.hook";
import type { Attribution, RoomPlayer, TurnMode } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

type RoomSimulationOptions = {
  players: RoomPlayer[];
  /** The seat at this device; null when everyone passes one device round and draws every turn. */
  youId: string | null;
  words: { category: string; word: string }[];
  mode: TurnMode;
  attribution: Attribution;
};

/**
 * A whole round without a server: the shared drawing, the clock, whose turn it is, and simulated players drawing on
 * their turns. Both the phone view and the host screen render from this, as they will from server messages later.
 */
export function useRoomSimulation({ players, youId, words, mode, attribution }: RoomSimulationOptions) {
  const [drawing] = useState(DrawingUtils.createDrawing);
  const [round, setRound] = useState(() => RoundUtils.create(mode));
  const [wordIndex, setWordIndex] = useState(0);
  const [now, setNow] = useState(Date.now);
  /** voter id → suspect id, for this round. */
  const [votes, setVotes] = useState<Record<string, string>>({});

  const families = useMemo(() => {
    if (attribution !== "shades") return null;
    const byPlayer: Record<string, CanvasColour[]> = {};
    players.forEach((player, index) => {
      byPlayer[player.id] = CanvasTools.shadeFamilies[index % CanvasTools.shadeFamilies.length] ?? [];
    });
    return byPlayer;
  }, [attribution, players]);

  /** One colour per player for avatars and pen tags, only when players have shade families. */
  const identities = useMemo(
    () =>
      families
        ? Object.fromEntries(players.map((player) => [player.id, families[player.id]?.[2]?.value ?? ""]))
        : undefined,
    [families, players],
  );

  const order = useMemo(() => players.map((player) => player.id), [players]);
  const drawingNow = round.phase === "drawing";
  const activeIndex = RoundUtils.activeIndex(round, players.length);
  const active = drawingNow ? players[activeIndex] : undefined;
  const next = drawingNow ? players[(activeIndex + 1) % players.length] : undefined;
  const yourTurn = !!active && (youId === null || active.id === youId);
  const word = words[wordIndex % words.length] ?? { category: "Things", word: "Umbrella" };

  const strokeFinished = (turnCount: number) =>
    setRound((current) => RoundUtils.strokeFinished(current, turnCount, Date.now()));

  useTicker(drawingNow, (time) => {
    setNow(time);
    setRound((current) => RoundUtils.tick(current, time));
  });

  const botId = active && !yourTurn ? active.id : null;
  useBotTurn(drawing, round, botId, strokeFinished, botId ? families?.[botId] : undefined);

  const start = () => {
    const time = Date.now();
    setNow(time);
    setRound((current) => RoundUtils.start(current, time));
  };
  const endTurn = () => {
    const time = Date.now();
    setNow(time);
    setRound((current) => RoundUtils.endTurn(current, round.turnCount, time));
  };
  /** A vote is final: a second one from the same voter is ignored. */
  const vote = (voterId: string, suspectId: string) =>
    setVotes((current) => (voterId in current ? current : { ...current, [voterId]: suspectId }));

  const newRound = () => {
    drawing.clear();
    setVotes({});
    setWordIndex((index) => index + 1);
    setRound((current) => RoundUtils.create(current.mode));
  };

  return {
    players,
    drawing,
    round,
    now,
    word,
    families,
    identities,
    votes,
    active,
    next,
    yourTurn,
    order,
    start,
    endTurn,
    newRound,
    vote,
    strokeFinished,
  };
}

export type RoomSimulation = ReturnType<typeof useRoomSimulation>;
