import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";

type RoomRevealProps = {
  players: RoomPlayer[];
  /**
   * Who played the round (its `turnOrder`): only they are artists, as the server counts them; someone who joined
   * during it isn't. Everyone in `players` when left out.
   */
  playerIds?: number[];
  bamboozlerId: number;
  /** Final votes: voter → suspect. */
  votes: Record<number, number>;
  youId?: number | null;
  /** The host screen: bigger, face beside the words, so it fits over the drawing's lower part. */
  big?: boolean;
};

/**
 * The moment of truth: who the bamboozler was, popping in, and what the votes mean for the points ("1 of 3 spotted
 * Sam (+1), so Sam slips through (+1)"). Who voted for whom is on the cards. On a phone on its side it's a line or two,
 * so the bamboozler's guess fits beside the drawing.
 */
export function RoomReveal({ players, playerIds, bamboozlerId, votes, youId = null, big = false }: RoomRevealProps) {
  const bamboozler = players.find((player) => player.id === bamboozlerId);
  const artists = players.filter(
    (player) => player.id !== bamboozlerId && (!playerIds || playerIds.includes(player.id)),
  );
  const caught = artists.filter((player) => votes[player.id] === bamboozlerId).length;
  if (!bamboozler) return null;
  const caughtLine =
    caught === 0
      ? "Nobody caught them!"
      : caught === artists.length
        ? "Everyone saw through it!"
        : `${caught} of ${artists.length} caught them`;

  if (big) {
    return (
      <div className="flex items-center gap-6 text-left">
        <AvatarDoodle
          strokes={bamboozler.avatar}
          backdrop={false}
          hat="worn"
          hatDelayMs={1200}
          className="mt-5 size-24 shrink-0 animate-pop-in motion-reduce:animate-none @7xl/room:size-32"
        />
        <div className="min-w-0">
          <p className="text-2xl text-white/75">The bamboozler was…</p>
          <p
            className="animate-pop-in font-display text-6xl leading-tight text-berry motion-reduce:animate-none"
            style={{ animationDelay: "500ms" }}
          >
            {bamboozler.name}
          </p>
          <p className="font-display text-3xl">{caughtLine}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sideways:gap-1">
      <p className={big ? "text-2xl text-white/75" : "text-white/75"}>The bamboozler was…</p>
      <div
        className="flex animate-pop-in flex-col items-center gap-2 motion-reduce:animate-none sideways:flex-row"
        style={{ animationDelay: "500ms" }}
      >
        <AvatarDoodle
          strokes={bamboozler.avatar}
          backdrop={false}
          hat="worn"
          hatDelayMs={1200}
          className={big ? "mt-10 size-36" : "mt-5 size-20 sideways:mt-2 sideways:size-12"}
        />
        <p className={`font-display text-berry ${big ? "text-6xl" : "text-4xl sideways:text-3xl"}`}>
          {bamboozler.id === youId ? "You!" : bamboozler.name}
        </p>
      </div>
      <p className={`font-display ${big ? "text-3xl" : "text-xl"}`}>
        {RoomViewUtils.spotted(caught, artists.length, { name: bamboozler.name, you: bamboozler.id === youId })}
      </p>
    </div>
  );
}
