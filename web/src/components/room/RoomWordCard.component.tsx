import type { Role } from "@/protocol/generated/Role";

type RoomWordCardProps = {
  category: string;
  /** Only artists get the word; pass null to the bamboozler and anyone not in the round, as the server will. */
  word: string | null;
  view: Role | "host";
};

/**
 * The secret on one line of the round banner: the category chip, a big token and a small tag. The word with
 * "everyone's word", or for the bamboozler "???" with "You're the bamboozler", in the same size and place, so the
 * shape doesn't give the role away across the table. Anyone not in the round sees "Who's sketchy?".
 */
export function RoomWordCard({ category, word, view }: RoomWordCardProps) {
  const known = view === "artist" && !!word;
  const bluffing = view === "bamboozler";
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 leading-none">
      <span className="shrink-0 rounded-full bg-night-soft px-2.5 py-1 text-xs text-white/80">
        <span className="sr-only">Category: </span>
        {category}
      </span>
      <span
        className={`min-w-0 truncate font-display text-3xl ${known ? "text-sun" : bluffing ? "text-berry" : "text-white"}`}
      >
        {known && <span className="sr-only">Secret word: </span>}
        {known ? word : bluffing ? "???" : "Who’s sketchy?"}
      </span>
      {(known || bluffing) && (
        <span className={`shrink-0 text-xs leading-tight ${bluffing ? "text-berry" : "text-white/70"}`}>
          {bluffing ? (
            "You’re the bamboozler"
          ) : (
            <>
              <span className="sr-only">, </span>everyone’s word
            </>
          )}
        </span>
      )}
    </p>
  );
}
