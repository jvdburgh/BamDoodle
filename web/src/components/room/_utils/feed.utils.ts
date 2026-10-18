import type { FeedLine } from "@/components/room/_types/room.types";
import type { RoundView } from "@/protocol/generated/RoundView";

/** The public, playful lines shown on every screen when someone changes who they suspect or locks a vote. */

type Name = { name: string; you: boolean };

function suspicion(voter: Name, suspect: string | null, before: string | null): string {
  if (suspect === null) return voter.you ? "You’re not sure anymore" : `${voter.name} isn’t sure anymore`;
  if (before === null)
    return voter.you ? `You think ${suspect} is sketchy` : `${voter.name} thinks ${suspect} is sketchy`;
  return voter.you ? `You now suspect ${suspect}` : `${voter.name} now suspects ${suspect}`;
}

function voted(voter: Name): string {
  return voter.you ? "You locked in your vote" : `${voter.name} has voted`;
}

const suspectOf = (round: RoundView, playerId: number) =>
  round.suspicions.find((suspicion) => suspicion.playerId === playerId)?.suspectId ?? null;

/** What happened between two states of the same round: changed suspicions and new votes, numbered from `firstId`. */
function between(before: RoundView, after: RoundView, at: number, firstId: number): FeedLine[] {
  const lines: FeedLine[] = [];
  const voters = new Set([...before.suspicions, ...after.suspicions].map((suspicion) => suspicion.playerId));
  for (const voterId of voters) {
    const [beforeId, suspectId] = [suspectOf(before, voterId), suspectOf(after, voterId)];
    if (beforeId !== suspectId)
      lines.push({ id: firstId + lines.length, at, voterId, kind: "suspect", suspectId, beforeId });
  }
  for (const voterId of after.voted) {
    if (!before.voted.includes(voterId)) lines.push({ id: firstId + lines.length, at, voterId, kind: "voted" });
  }
  return lines;
}

export const FeedUtils = { suspicion, voted, between };
