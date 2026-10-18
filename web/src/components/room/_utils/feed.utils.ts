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

export const FeedUtils = { suspicion, voted };
