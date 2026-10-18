import { useState } from "react";
import type { FeedLine } from "@/components/room/_types/room.types";
import { FeedUtils } from "@/components/room/_utils/feed.utils";
import type { RoundView } from "@/protocol/generated/RoundView";

const FEED_MS = 6_000;
const SHOWN = 3;

type Feed = { round: RoundView | null; lines: FeedLine[]; nextId: number };

/**
 * The table talk: a short-lived line for every change in who suspects whom and for every locked vote, worked out by
 * comparing the round with how it was before. Lines last six seconds; a new round starts quiet.
 */
export function useRoomFeed(round: RoundView | null, now: number): FeedLine[] {
  const [feed, setFeed] = useState<Feed>({ round, lines: [], nextId: 1 });

  if (feed.round !== round) {
    const before = feed.round;
    const sameRound = !!before && !!round && before.number === round.number;
    const added = sameRound ? FeedUtils.between(before, round, now, feed.nextId) : [];
    const kept = sameRound ? feed.lines.filter((line) => now - line.at < FEED_MS) : [];
    setFeed({ round, lines: [...kept, ...added].slice(-SHOWN), nextId: feed.nextId + added.length });
  }

  return feed.lines.filter((line) => now - line.at < FEED_MS);
}
