import type { Round } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";

export type RoundScore = {
  points: number;
  /** Artists: voted for the bamboozler. The bamboozler: got away with it (or guessed the word). */
  right: boolean;
};

/**
 * Points for one round (docs/game-rules.md, "Points"): an artist who voted for the bamboozler +1; the bamboozler +1
 * for guessing the word and +1 when fewer than half of the artists voted for them.
 */
function forRound(round: Round, playerIds: string[]): Record<string, RoundScore> {
  const votes = RoundUtils.finalVotes(round);
  const artists = playerIds.filter((id) => id !== round.bamboozlerId);
  const caughtBy = artists.filter((id) => votes[id] === round.bamboozlerId).length;
  const fooled = caughtBy < artists.length / 2;
  const guessed = round.guess?.right ?? false;

  const scores: Record<string, RoundScore> = {};
  for (const id of artists) {
    const right = votes[id] === round.bamboozlerId;
    scores[id] = { points: right ? 1 : 0, right };
  }
  scores[round.bamboozlerId] = { points: (fooled ? 1 : 0) + (guessed ? 1 : 0), right: fooled || guessed };
  return scores;
}

function add(totals: Record<string, number>, scores: Record<string, RoundScore>): Record<string, number> {
  const next = { ...totals };
  for (const [id, score] of Object.entries(scores)) next[id] = (next[id] ?? 0) + score.points;
  return next;
}

export type Standing = { playerId: string; total: number; place: number };

/** Highest first; tied players share a place (1, 2, 2, 4). */
function standings(totals: Record<string, number>, playerIds: string[]): Standing[] {
  const sorted = playerIds
    .map((playerId, order) => ({ playerId, total: totals[playerId] ?? 0, order }))
    .sort((a, b) => b.total - a.total || a.order - b.order);
  return sorted.map(({ playerId, total }) => ({
    playerId,
    total,
    place: sorted.findIndex((entry) => entry.total === total) + 1,
  }));
}

export const ScoreUtils = { forRound, add, standings };
