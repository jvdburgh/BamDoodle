import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { useBotTurn, type BotPen } from "@/components/lab/_hooks/botTurn.hook";
import type { Round, RoomSetup, WordCard } from "@/components/lab/_types/lab.types";
import { LabRoomUtils } from "@/components/lab/_utils/labRoom.utils";
import { RoundUtils } from "@/components/lab/_utils/round.utils";
import { ScoreUtils } from "@/components/lab/_utils/score.utils";
import { useTicker } from "@/components/room/_hooks/ticker.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { StrokeView } from "@/protocol/generated/StrokeView";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LabRoomOptions = {
  code: string;
  players: RoomPlayer[];
  /** Your seat; you're also the host. */
  youId: number;
  words: WordCard[];
  setup: RoomSetup;
  wordCategories?: WordCategory[];
  /** Make you the bamboozler every round, for testing that view; otherwise it's a random other player. */
  youAreBamboozler?: boolean;
};

const BOT_SUSPECT_EVERY_MS = 2_600;
const BOT_GUESS_RIGHT = 0.35;

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)] as T;
const finish = (stroke: StrokeView): StrokeView => (stroke.done ? stroke : { ...stroke, done: true });

/**
 * A whole game without a server, for UI work: rounds of drawing, suspicions, the final vote, the reveal, the
 * bamboozler's guess and the scores, with simulated players doing all of it on their own. It answers your messages
 * the way the server would and hands out the same room state (for your phone and for a host screen), so the room's
 * views can't tell the difference.
 */
export function useLabRoom({
  code,
  players,
  youId,
  words,
  setup,
  wordCategories = [],
  youAreBamboozler = false,
}: LabRoomOptions) {
  const ids = useMemo(() => players.map((player) => player.id), [players]);

  const newRound = (): Round => {
    const others = ids.filter((id) => id !== youId);
    const bamboozlerId = youAreBamboozler ? youId : pick(others.length > 0 ? others : ids);
    return RoundUtils.create({
      mode: setup.mode,
      turnMs: RoundUtils.turnMsFor(setup),
      totalTurns: RoundUtils.turnsPerPlayerFor(setup) * ids.length,
      bamboozlerId,
    });
  };

  const [round, setRound] = useState(newRound);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totals, setTotals] = useState<Record<number, number>>({});
  const [wordIndex, setWordIndex] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [strokes, setStrokes] = useState<StrokeView[]>([]);
  const strokeId = useRef(0);
  /** The latest round, ahead of React's render; every transition goes through `apply` so none overwrites another. */
  const current = useRef(round);
  const apply = (transition: (latest: Round) => Round): boolean => {
    const before = current.current;
    const next = transition(before);
    if (next === before) return false;
    current.current = next;
    setRound(next);
    // A turn that ran out mid-stroke ends that stroke, as the server does.
    if (next.turnCount !== before.turnCount || next.phase !== before.phase) {
      setStrokes((all) => (all.some((stroke) => !stroke.done) ? all.map(finish) : all));
    }
    return true;
  };

  const { phase } = round;
  const activeId = phase === "drawing" ? ids[RoundUtils.activeIndex(round, ids.length)] : undefined;
  const word = words[wordIndex % words.length] ?? { category: "Things", word: "Umbrella" };
  const families = useMemo(() => RoomViewUtils.families(players, setup.attribution), [players, setup.attribution]);

  const pen: BotPen = {
    begin: (playerId, colour, size, point) => {
      const stroke: StrokeView = { id: ++strokeId.current, playerId, colour, size, points: [point], done: false };
      setStrokes((all) => [...all.map(finish), stroke]);
    },
    extend: (points: StrokePoint[]) =>
      setStrokes((all) =>
        all.map((stroke) => (stroke.done ? stroke : { ...stroke, points: [...stroke.points, ...points] })),
      ),
    end: () => setStrokes((all) => all.map(finish)),
  };

  const suspect = (voterId: number, suspectId: number | null) =>
    apply((latest) => RoundUtils.suspect(latest, voterId, suspectId));
  const vote = (voterId: number, suspectId: number) =>
    apply((latest) => RoundUtils.castVote(latest, voterId, suspectId, ids, Date.now()));
  const guess = (text: string) => apply((latest) => RoundUtils.guessWord(latest, text, word.word, Date.now()));
  const strokeFinished = (turnCount: number) =>
    apply((latest) => RoundUtils.strokeFinished(latest, turnCount, Date.now()));

  useTicker(phase === "drawing" || phase === "voting" || phase === "guess", (time) => {
    setNow(time);
    apply((latest) => RoundUtils.tick(latest, time));
  });

  const botId = activeId !== undefined && activeId !== youId ? activeId : null;
  useBotTurn(round, botId, pen, strokeFinished, botId !== null ? families?.[botId] : undefined);

  // Simulated players: change their minds now and then while drawing, vote during the vote, and guess.
  const bots = useMemo(() => ids.filter((id) => id !== youId), [ids, youId]);
  const latest = useRef({ suspect, vote, guess });
  useLayoutEffect(() => {
    latest.current = { suspect, vote, guess };
  });

  useEffect(() => {
    if (phase !== "drawing") return;
    const timer = window.setInterval(() => {
      if (Math.random() > 0.45) return;
      const bot = pick(bots);
      latest.current.suspect(bot, pick(ids.filter((id) => id !== bot)));
    }, BOT_SUSPECT_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [phase, bots, ids]);

  useEffect(() => {
    if (phase !== "voting") return;
    const timers = bots.map((bot) =>
      window.setTimeout(
        () => latest.current.vote(bot, current.current.suspicions[bot] ?? pick(ids.filter((id) => id !== bot))),
        2_500 + Math.random() * 14_000,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase, bots, ids]);

  useEffect(() => {
    if (phase !== "guess" || round.bamboozlerId === youId) return;
    const decoys = words.map((card) => card.word).filter((candidate) => candidate !== word.word);
    const timer = window.setTimeout(
      () => latest.current.guess(Math.random() < BOT_GUESS_RIGHT ? word.word : pick(decoys)),
      2_500 + Math.random() * 2_500,
    );
    return () => window.clearTimeout(timer);
  }, [phase, round.bamboozlerId, youId, word.word, words]);

  const startRound = () => {
    const time = Date.now();
    setNow(time);
    if (current.current.phase === "waiting") {
      apply((latest) => RoundUtils.start(latest, time));
      return;
    }
    if (current.current.phase !== "results") return;
    const gameOver = roundNumber >= setup.rounds;
    setTotals(gameOver ? {} : ScoreUtils.add(totals, ScoreUtils.awards(current.current, ids)));
    setRoundNumber(gameOver ? 1 : roundNumber + 1);
    setWordIndex((index) => index + 1);
    setStrokes([]);
    apply(() => RoundUtils.start(newRound(), time));
  };

  /** Your messages, answered the way the server would (it's more forgiving: the lab trusts you). */
  const send = (message: ClientMessage) => {
    const live = current.current;
    const yourTurn = live.phase === "drawing" && ids[RoundUtils.activeIndex(live, ids.length)] === youId;
    switch (message.type) {
      case "startRound":
        return startRound();
      case "beginStroke":
        if (yourTurn) pen.begin(youId, message.colour, message.size, message.points[0] ?? [0.5, 0.5, 0.5]);
        if (yourTurn && message.points.length > 1) pen.extend(message.points.slice(1));
        return;
      case "extendStroke":
        if (yourTurn) pen.extend(message.points);
        return;
      case "endStroke":
        if (!yourTurn) return;
        pen.end();
        strokeFinished(current.current.turnCount);
        return;
      case "suspect":
        suspect(youId, message.suspectId);
        return;
      case "castVote":
        vote(youId, message.suspectId);
        return;
      case "guessWord":
        guess(message.guess);
        return;
      default:
        return;
    }
  };

  const snapshot = { code, players, youId, setup, wordCategories, round, roundNumber, totals, word, strokes, now };
  return {
    player: LabRoomUtils.toState(snapshot, "player"),
    host: LabRoomUtils.toState(snapshot, "host"),
    send,
  };
}
