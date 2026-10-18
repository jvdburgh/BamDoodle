import type { Round } from "@/components/lab/_types/lab.types";
import { RoundUtils } from "@/components/lab/_utils/round.utils";
import type { Award } from "@/protocol/generated/Award";

/**
 * Points for one round as the server awards them (docs/game-rules.md, "Points"): an artist who voted for the
 * bamboozler +1; the bamboozler +1 for guessing the word and +1 when fewer than half of the artists voted for them.
 */
function awards(round: Round, playerIds: number[]): Award[] {
  const votes = RoundUtils.finalVotes(round);
  const artists = playerIds.filter((id) => id !== round.bamboozlerId);
  const caught = artists.filter((id) => votes[id] === round.bamboozlerId);
  const list: Award[] = caught.map((playerId) => ({ playerId, reason: "caughtTheBamboozler", points: 1 }));
  if (round.guess?.right) list.push({ playerId: round.bamboozlerId, reason: "guessedTheWord", points: 1 });
  if (caught.length < artists.length / 2)
    list.push({ playerId: round.bamboozlerId, reason: "stayedHidden", points: 1 });
  return list;
}

function add(totals: Record<number, number>, awarded: Award[]): Record<number, number> {
  const next = { ...totals };
  for (const award of awarded) next[award.playerId] = (next[award.playerId] ?? 0) + award.points;
  return next;
}

export const ScoreUtils = { awards, add };
