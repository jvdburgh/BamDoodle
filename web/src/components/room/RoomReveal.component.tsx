import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";

type RoomRevealProps = {
  /** Everyone who played the round: the bamboozler and the artists. */
  players: RoomPlayer[];
  bamboozlerId: number;
  /** Final votes: voter → suspect. */
  votes: Record<number, number>;
  youId?: number | null;
  /** Bigger for the host screen. */
  big?: boolean;
};

/**
 * The moment of truth: who the bamboozler was, popping in, and what the votes mean for the points ("1 of 3 spotted
 * Sam, so Sam slips through (+1)"). Who voted for whom is on the cards. On a phone on its side it's a line or two,
 * so the bamboozler's guess fits beside the drawing.
 */
export function RoomReveal({ players, bamboozlerId, votes, youId = null, big = false }: RoomRevealProps) {
  const bamboozler = players.find((player) => player.id === bamboozlerId);
  const artists = players.filter((player) => player.id !== bamboozlerId);
  const caught = artists.filter((player) => votes[player.id] === bamboozlerId).length;
  if (!bamboozler) return null;

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
