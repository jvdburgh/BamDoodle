import type { FeedLine } from "@/components/room/_hooks/roomSimulation.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { FeedUtils } from "@/components/room/_utils/feed.utils";

type RoomFeedProps = {
  lines: FeedLine[];
  players: RoomPlayer[];
  /** Whose screen this is, so their own lines say "You"; null on the host screen. */
  youId?: string | null;
  /** Bigger for the host screen. */
  big?: boolean;
};

/** The latest public news ("Noor thinks Jip is sketchy"), as short-lived notes stacked over the canvas. */
export function RoomFeed({ lines, players, youId = null, big = false }: RoomFeedProps) {
  const nameOf = (id: string) => players.find((player) => player.id === id)?.name ?? "Someone";
  const text = (line: FeedLine) => {
    const voter = { name: nameOf(line.voterId), you: line.voterId === youId };
    if (line.kind === "voted") return FeedUtils.voted(voter);
    return FeedUtils.suspicion(
      voter,
      line.suspectId ? nameOf(line.suspectId) : null,
      line.beforeId ? nameOf(line.beforeId) : null,
    );
  };
  return (
    <ol aria-live="polite" aria-label="Table talk" className="pointer-events-none flex flex-col items-end gap-1.5">
      {lines.map((line) => (
        <li
          key={line.id}
          className={`animate-rise-in rounded-full bg-night/90 text-white shadow-[0_2px_0_var(--color-night-deep)] motion-reduce:animate-none ${
            big ? "px-4 py-1.5 text-lg" : "px-3 py-1 text-sm"
          }`}
        >
          {text(line)}
        </li>
      ))}
    </ol>
  );
}
