import type { Round, TurnMode } from "@/components/room/_types/room.types";

/** Starting points to tune in playtests: the round length is from docs/game-rules.md, the Classic turn is a guess. */
const ROUND_MS = 60_000;
const TURN_MS: Record<TurnMode, number> = { classic: 8_000, timed: 10_000 };

const turnLength = (mode: TurnMode) => TURN_MS[mode];

function create(mode: TurnMode): Round {
  return { mode, phase: "waiting", turnCount: 0, roundStartedAt: 0, turnStartedAt: 0 };
}

function start(round: Round, now: number): Round {
  return { ...round, phase: "drawing", turnCount: 0, roundStartedAt: now, turnStartedAt: now };
}

/** Ends turn `turnCount`; a no-op when that turn already ended (the clock got there first), so nobody is skipped. */
function endTurn(round: Round, turnCount: number, now: number): Round {
  if (round.phase !== "drawing" || round.turnCount !== turnCount) return round;
  return { ...round, turnCount: round.turnCount + 1, turnStartedAt: now };
}

/** Classic turns are one stroke long; timed turns keep going until their time is up. */
function strokeFinished(round: Round, turnCount: number, now: number): Round {
  return round.mode === "classic" ? endTurn(round, turnCount, now) : round;
}

/** Moves the clock on: expired turns pass to the next player, and the round ends when its time is up. */
function tick(round: Round, now: number): Round {
  if (round.phase !== "drawing") return round;
  if (now - round.roundStartedAt >= ROUND_MS) return { ...round, phase: "over" };
  const length = turnLength(round.mode);
  const expired = Math.floor((now - round.turnStartedAt) / length);
  if (expired < 1) return round;
  return { ...round, turnCount: round.turnCount + expired, turnStartedAt: round.turnStartedAt + expired * length };
}

/** The mode only changes between rounds. */
function setMode(round: Round, mode: TurnMode): Round {
  return round.phase === "drawing" ? round : create(mode);
}

const activeIndex = (round: Round, playerCount: number) => round.turnCount % playerCount;

function turnLeft(round: Round, now: number): number {
  if (round.phase !== "drawing") return 0;
  const length = turnLength(round.mode);
  return Math.min(length, Math.max(0, length - (now - round.turnStartedAt)));
}

function roundLeft(round: Round, now: number): number {
  if (round.phase === "waiting") return ROUND_MS;
  if (round.phase === "over") return 0;
  return Math.min(ROUND_MS, Math.max(0, ROUND_MS - (now - round.roundStartedAt)));
}

/** Milliseconds as a countdown, rounded up so "0:00" only shows when time is really up. */
function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const RoundUtils = {
  ROUND_MS,
  turnLength,
  create,
  start,
  endTurn,
  strokeFinished,
  tick,
  setMode,
  activeIndex,
  turnLeft,
  roundLeft,
  formatClock,
};
