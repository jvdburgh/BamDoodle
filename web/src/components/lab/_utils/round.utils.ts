import type { Round, RoomSetup } from "@/components/lab/_types/lab.types";
import type { TurnMode } from "@/protocol/generated/TurnMode";

/** The server's timings (docs/game-rules.md), copied so the lab plays like a real room. */
const ONE_STROKE_TURN_MS = 15_000;
const TIMED_TURNS_PER_PLAYER = 2;
const VOTE_MS = 30_000;
const GUESS_MS = 20_000;

const DEFAULT_SETUP: RoomSetup = {
  mode: "timed",
  turnsPerPlayer: 3,
  turnSeconds: 20,
  rounds: 4,
  attribution: "free",
  language: "en",
  categories: [],
};

const turnsPerPlayerFor = (setup: Pick<RoomSetup, "mode" | "turnsPerPlayer">) =>
  setup.mode === "oneStroke" ? setup.turnsPerPlayer : TIMED_TURNS_PER_PLAYER;
const turnMsFor = (setup: Pick<RoomSetup, "mode" | "turnSeconds">) =>
  setup.mode === "oneStroke" ? ONE_STROKE_TURN_MS : setup.turnSeconds * 1000;

type NewRound = { mode: TurnMode; turnMs: number; totalTurns: number; bamboozlerId: number };

function create({ mode, turnMs, totalTurns, bamboozlerId }: NewRound): Round {
  return {
    mode,
    phase: "waiting",
    turnCount: 0,
    totalTurns,
    turnMs,
    turnStartedAt: 0,
    phaseStartedAt: 0,
    bamboozlerId,
    suspicions: {},
    votes: {},
    guess: null,
  };
}

function start(round: Round, now: number): Round {
  if (round.phase !== "waiting") return round;
  return { ...round, phase: "drawing", turnCount: 0, turnStartedAt: now, phaseStartedAt: now };
}

const toVoting = (round: Round, at: number): Round => ({ ...round, phase: "voting", phaseStartedAt: at });

/** Ends turn `turnCount`; a no-op when that turn already ended (the clock got there first), so nobody is skipped. */
function endTurn(round: Round, turnCount: number, now: number): Round {
  if (round.phase !== "drawing" || round.turnCount !== turnCount) return round;
  const next = round.turnCount + 1;
  return next >= round.totalTurns ? toVoting(round, now) : { ...round, turnCount: next, turnStartedAt: now };
}

/** One-stroke turns end with the stroke; timed turns keep going until their time is up. */
function strokeFinished(round: Round, turnCount: number, now: number): Round {
  return round.mode === "oneStroke" ? endTurn(round, turnCount, now) : round;
}

/** Final votes: the locked ones, and for anyone who didn't lock one, their last suspicion. */
function finalVotes(round: Round): Record<number, number> {
  return { ...round.suspicions, ...round.votes };
}

/**
 * Moves the clock on: turns expire, then the vote and the guess each run out. Catches up in one go when
 * the page was hidden for a while, instead of flashing through every phase.
 */
function tick(round: Round, now: number): Round {
  let current = round;
  for (let step = 0; step < 8; step++) {
    const next = tickOnce(current, now);
    if (next === current) return current;
    current = next;
  }
  return current;
}

function tickOnce(round: Round, now: number): Round {
  const elapsed = now - round.phaseStartedAt;
  switch (round.phase) {
    case "drawing": {
      const expired = Math.floor((now - round.turnStartedAt) / round.turnMs);
      if (expired < 1) return round;
      const turnCount = round.turnCount + expired;
      if (turnCount >= round.totalTurns) {
        const lastTurnEnded = round.turnStartedAt + (round.totalTurns - round.turnCount) * round.turnMs;
        return toVoting(round, Math.min(now, lastTurnEnded));
      }
      return { ...round, turnCount, turnStartedAt: round.turnStartedAt + expired * round.turnMs };
    }
    case "voting":
      return elapsed >= VOTE_MS
        ? { ...round, phase: "guess", votes: finalVotes(round), phaseStartedAt: round.phaseStartedAt + VOTE_MS }
        : round;
    case "guess":
      return elapsed >= GUESS_MS
        ? { ...round, phase: "results", guess: null, phaseStartedAt: round.phaseStartedAt + GUESS_MS }
        : round;
    default:
      return round;
  }
}

/** Changing your mind is allowed (and public) while the drawing goes on. Null stops suspecting. */
function suspect(round: Round, voterId: number, suspectId: number | null): Round {
  if (round.phase !== "drawing" || voterId === suspectId) return round;
  if ((round.suspicions[voterId] ?? null) === suspectId) return round;
  const suspicions = { ...round.suspicions };
  if (suspectId === null) delete suspicions[voterId];
  else suspicions[voterId] = suspectId;
  return { ...round, suspicions };
}

/** A final vote, or a change of it. Once everyone has voted, the reveal and the guess start straight away. */
function castVote(round: Round, voterId: number, suspectId: number, playerIds: number[], now: number): Round {
  if (round.phase !== "voting" || voterId === suspectId) return round;
  const votes = { ...round.votes, [voterId]: suspectId };
  const everyone = playerIds.every((id) => id in votes);
  return everyone ? { ...round, votes, phase: "guess", phaseStartedAt: now } : { ...round, votes };
}

const normalise = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Edit distance, capped: all we need to know is whether it's 0, 1 or more. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** The bamboozler's one try: case, accents and punctuation don't matter, and one typo is forgiven in longer words. */
function guessWord(round: Round, text: string, word: string, now: number): Round {
  if (round.phase !== "guess") return round;
  const [guess, answer] = [normalise(text), normalise(word)];
  const right = guess !== "" && (guess === answer || (answer.length >= 5 && withinOneEdit(guess, answer)));
  return { ...round, phase: "results", guess: { text: text.trim(), right }, phaseStartedAt: now };
}

const activeIndex = (round: Round, playerCount: number) => round.turnCount % playerCount;
/** Which of their turns the players are on: "Turn 2 of 3". */
const turn = (round: Round, playerCount: number) => Math.floor(round.turnCount / playerCount) + 1;

function turnLeft(round: Round, now: number): number {
  if (round.phase !== "drawing") return 0;
  return Math.min(round.turnMs, Math.max(0, round.turnMs - (now - round.turnStartedAt)));
}

const phaseLength: Partial<Record<Round["phase"], number>> = { voting: VOTE_MS, guess: GUESS_MS };

/** Time left in a timed phase (voting, guess); 0 otherwise. */
function phaseLeft(round: Round, now: number): number {
  const length = phaseLength[round.phase];
  return length ? Math.min(length, Math.max(0, length - (now - round.phaseStartedAt))) : 0;
}

export const RoundUtils = {
  DEFAULT_SETUP,
  VOTE_MS,
  GUESS_MS,
  turnsPerPlayerFor,
  turnMsFor,
  create,
  start,
  endTurn,
  strokeFinished,
  tick,
  suspect,
  castVote,
  finalVotes,
  guessWord,
  activeIndex,
  turn,
  turnLeft,
  phaseLeft,
};
