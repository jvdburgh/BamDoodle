import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";

type RoomRevealProps = {
  players: RoomPlayer[];
  bamboozlerId: number;
  /** Final votes: voter → suspect. */
  votes: Record<number, number>;
  youId?: number | null;
  /** The host screen: bigger, face beside the words, so it fits over the drawing's lower part. */
  big?: boolean;
};

/** The moment of truth: who the bamboozler was, popping in, and how many caught them. Who voted for whom is on the cards. */
export function RoomReveal({ players, bamboozlerId, votes, youId = null, big = false }: RoomRevealProps) {
  const bamboozler = players.find((player) => player.id === bamboozlerId);
  const artists = players.filter((player) => player.id !== bamboozlerId);
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
    <div className="flex flex-col items-center gap-4 text-center">
      <p className={big ? "text-2xl text-white/75" : "text-white/75"}>The bamboozler was…</p>
      <div
        className="flex animate-pop-in flex-col items-center gap-2 motion-reduce:animate-none"
        style={{ animationDelay: "500ms" }}
      >
        <AvatarDoodle
          strokes={bamboozler.avatar}
          backdrop={false}
          hat="worn"
          hatDelayMs={1200}
          className={big ? "mt-10 size-36" : "mt-5 size-20"}
        />
        <p className={`font-display text-berry ${big ? "text-6xl" : "text-4xl"}`}>
          {bamboozler.id === youId ? "You!" : bamboozler.name}
        </p>
      </div>
      <p className={`font-display ${big ? "text-3xl" : "text-xl"}`}>
        {caught === 0
          ? "Nobody caught them!"
          : caught === artists.length
            ? "Everyone saw through it!"
            : `${caught} of ${artists.length} caught them`}
      </p>
    </div>
  );
}
