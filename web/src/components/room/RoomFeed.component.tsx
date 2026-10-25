import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { FeedLine, RoomPlayer } from "@/components/room/_types/room.types";
import { FeedUtils } from "@/components/room/_utils/feed.utils";

type RoomFeedProps = {
  lines: FeedLine[];
  players: RoomPlayer[];
  /** Whose screen this is, so their own lines say "You"; null on the host screen. */
  youId?: number | null;
  /** Bigger for the host screen. */
  big?: boolean;
};

/**
 * The latest public news ("Noor thinks Jip is sketchy"), as short-lived notes stacked over the canvas, with the faces
 * of who's involved: the one who suspects or voted, and the suspect in the hat. The words name them for screen readers.
 */
export function RoomFeed({ lines, players, youId = null, big = false }: RoomFeedProps) {
  const playerOf = (id: number | null) => (id === null ? undefined : players.find((player) => player.id === id));
  const nameOf = (id: number) => playerOf(id)?.name ?? "Someone";
  const text = (line: FeedLine) => {
    const voter = { name: nameOf(line.voterId), you: line.voterId === youId };
    if (line.kind === "voted") return FeedUtils.voted(voter);
    return FeedUtils.suspicion(
      voter,
      line.suspectId === null ? null : nameOf(line.suspectId),
      line.beforeId === null ? null : nameOf(line.beforeId),
    );
  };
  const face = big ? "size-9" : "size-6";
  return (
    <ol aria-live="polite" aria-label="Table talk" className="pointer-events-none flex flex-col items-end gap-1.5">
      {lines.map((line) => {
        const voter = playerOf(line.voterId);
        const suspect = line.kind === "suspect" ? playerOf(line.suspectId) : undefined;
        return (
          <li
            key={line.id}
            className={`flex animate-rise-in items-center rounded-full bg-night/90 text-white shadow-[0_2px_0_var(--color-night-deep)] motion-reduce:animate-none ${
              big ? "gap-2 py-1 pl-1.5 text-lg" : "gap-1.5 py-0.5 pl-1 text-sm"
            } ${suspect ? (big ? "pr-2" : "pr-1") : big ? "pr-4" : "pr-3"}`}
          >
            {voter && <AvatarDoodle strokes={voter.avatar} backdrop={false} className={`shrink-0 ${face}`} />}
            <span>{text(line)}</span>
            {suspect && (
              <AvatarDoodle strokes={suspect.avatar} backdrop={false} hat="worn" className={`shrink-0 ${face}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
