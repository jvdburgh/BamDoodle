import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CanvasTools, type CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";
import type { WordCard } from "@/components/room/_fixtures/players.fixture";
import { useBotTurn } from "@/components/room/_hooks/botTurn.hook";
import { useTicker } from "@/components/room/_hooks/ticker.hook";
import type { RoomPlayer, RoomSetup, Round } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import { ScoreUtils } from "@/components/room/_utils/score.utils";

type RoomSimulationOptions = {
  players: RoomPlayer[];
  /** The seat at this device; null when everyone passes one device round and draws every turn. */
  youId: string | null;
  words: WordCard[];
  setup: RoomSetup;
  /** Make you the bamboozler every round, for testing that view; otherwise it's a random other player. */
  youAreBamboozler?: boolean;
};

/** A public fact for the table talk; each screen words it for its viewer. */
export type FeedLine = {
  id: number;
  at: number;
  voterId: string;
} & ({ kind: "suspect"; suspectId: string | null; beforeId: string | null } | { kind: "voted" });

const FEED_MS = 6_000;
const BOT_SUSPECT_EVERY_MS = 2_600;
const BOT_GUESS_RIGHT = 0.35;

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)] as T;

/**
 * A whole game without a server: rounds of drawing, suspicions, the final vote, the reveal, the bamboozler's guess
 * and the scores, with simulated players doing all of it on their own. The phone view and the host screen render
 * from this, as they will from server messages later.
 */
export function useRoomSimulation({ players, youId, words, setup, youAreBamboozler = false }: RoomSimulationOptions) {
  const ids = useMemo(() => players.map((player) => player.id), [players]);

  const newRound = (): Round => {
    const others = ids.filter((id) => id !== youId);
    const bamboozlerId = youAreBamboozler && youId ? youId : pick(others.length > 0 ? others : ids);
    return RoundUtils.create({
      mode: setup.mode,
      turnMs: RoundUtils.turnMsFor(setup),
      totalTurns: RoundUtils.turnsPerPlayerFor(setup) * ids.length,
      bamboozlerId,
    });
  };

  const [drawing] = useState(DrawingUtils.createDrawing);
  const [round, setRound] = useState(newRound);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [gameOver, setGameOver] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const feedId = useRef(0);
  /** The latest round, ahead of React's render; every transition goes through `apply` so none overwrites another. */
  const current = useRef(round);
  const apply = (transition: (latest: Round) => Round): boolean => {
    const next = transition(current.current);
    if (next === current.current) return false;
    current.current = next;
    setRound(next);
    return true;
  };

  const families = useMemo(() => {
    if (setup.attribution !== "shades") return null;
    const byPlayer: Record<string, CanvasColour[]> = {};
    players.forEach((player, index) => {
      byPlayer[player.id] = CanvasTools.shadeFamilies[index % CanvasTools.shadeFamilies.length] ?? [];
    });
    return byPlayer;
  }, [setup.attribution, players]);

  /** One colour per player for avatars and pen tags, only when players have shade families. */
  const identities = useMemo(
    () =>
      families
        ? Object.fromEntries(players.map((player) => [player.id, families[player.id]?.[2]?.value ?? ""]))
        : undefined,
    [families, players],
  );

  const { phase } = round;
  const activeIndex = RoundUtils.activeIndex(round, players.length);
  const active = phase === "drawing" ? players[activeIndex] : undefined;
  const next = phase === "drawing" ? players[(activeIndex + 1) % players.length] : undefined;
  const yourTurn = !!active && (youId === null || active.id === youId);
  const word = words[wordIndex % words.length] ?? { category: "Things", word: "Umbrella" };
  const roundScores = phase === "results" && !gameOver ? ScoreUtils.forRound(round, ids) : null;
  const shownTotals = roundScores ? ScoreUtils.add(totals, roundScores) : totals;
  const lastRound = roundNumber >= setup.rounds;

  const say = (line: FeedLine) => {
    setFeed((lines) => [...lines.filter((old) => line.at - old.at < FEED_MS), line].slice(-3));
  };

  const suspect = (voterId: string, suspectId: string | null) => {
    const before = current.current.suspicions[voterId] ?? null;
    if (!apply((latest) => RoundUtils.suspect(latest, voterId, suspectId))) return;
    say({ id: ++feedId.current, at: Date.now(), kind: "suspect", voterId, suspectId, beforeId: before });
  };

  const vote = (voterId: string, suspectId: string) => {
    if (!apply((latest) => RoundUtils.castVote(latest, voterId, suspectId, ids, Date.now()))) return;
    say({ id: ++feedId.current, at: Date.now(), kind: "voted", voterId });
  };

  const guess = (text: string) => apply((latest) => RoundUtils.guessWord(latest, text, word.word, Date.now()));
  const strokeFinished = (turnCount: number) =>
    apply((latest) => RoundUtils.strokeFinished(latest, turnCount, Date.now()));

  useTicker(phase === "drawing" || phase === "voting" || phase === "reveal" || phase === "guess", (time) => {
    setNow(time);
    apply((latest) => RoundUtils.tick(latest, time));
  });

  const botId = active && !yourTurn ? active.id : null;
  useBotTurn(drawing, round, botId, strokeFinished, botId ? families?.[botId] : undefined);

  // Simulated players: change their minds now and then while drawing, vote during the vote, and guess.
  const bots = useMemo(() => ids.filter((id) => id !== youId), [ids, youId]);
  const suspectRef = useRef(suspect);
  const voteRef = useRef(vote);
  const guessRef = useRef(guess);
  useLayoutEffect(() => {
    suspectRef.current = suspect;
    voteRef.current = vote;
    guessRef.current = guess;
  });

  useEffect(() => {
    if (phase !== "drawing" || youId === null) return;
    const timer = window.setInterval(() => {
      if (Math.random() > 0.45) return;
      const bot = pick(bots);
      suspectRef.current(bot, pick(ids.filter((id) => id !== bot)));
    }, BOT_SUSPECT_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [phase, bots, ids, youId]);

  useEffect(() => {
    if (phase !== "voting" || youId === null) return;
    const timers = bots.map((bot) =>
      window.setTimeout(
        () => {
          const choice = current.current.suspicions[bot] ?? pick(ids.filter((id) => id !== bot));
          voteRef.current(bot, choice);
        },
        2_500 + Math.random() * 14_000,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase, bots, ids, youId]);

  useEffect(() => {
    if (phase !== "guess" || round.bamboozlerId === youId) return;
    const decoys = words.map((card) => card.word).filter((candidate) => candidate !== word.word);
    const timer = window.setTimeout(
      () => guessRef.current(Math.random() < BOT_GUESS_RIGHT ? word.word : pick(decoys)),
      2_500 + Math.random() * 2_500,
    );
    return () => window.clearTimeout(timer);
  }, [phase, round.bamboozlerId, youId, word.word, words]);

  const start = () => {
    const time = Date.now();
    setNow(time);
    apply((latest) => RoundUtils.start(latest, time));
  };
  const endTurn = () => {
    const time = Date.now();
    setNow(time);
    apply((latest) => RoundUtils.endTurn(latest, round.turnCount, time));
  };
  const startNextRound = () => {
    const time = Date.now();
    drawing.clear();
    setFeed([]);
    setNow(time);
    setWordIndex((index) => index + 1);
    apply(() => RoundUtils.start(newRound(), time));
  };
  /** The host's button on the results: the next round, or the final scoreboard after the last one. */
  const nextRound = () => {
    if (roundScores) setTotals(ScoreUtils.add(totals, roundScores));
    if (lastRound) setGameOver(true);
    else {
      setRoundNumber((count) => count + 1);
      startNextRound();
    }
  };
  const newGame = () => {
    setTotals({});
    setGameOver(false);
    setRoundNumber(1);
    startNextRound();
  };

  return {
    players,
    setup,
    drawing,
    round,
    roundNumber,
    now,
    word,
    families,
    identities,
    active,
    next,
    yourTurn,
    order: ids,
    feed: feed.filter((line) => now - line.at < FEED_MS),
    roundScores,
    totals: shownTotals,
    gameOver,
    lastRound,
    start,
    endTurn,
    strokeFinished,
    suspect,
    vote,
    guess,
    nextRound,
    newGame,
  };
}

export type RoomSimulation = ReturnType<typeof useRoomSimulation>;
