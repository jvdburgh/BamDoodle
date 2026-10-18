import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { Role } from "@/protocol/generated/Role";

type RoomWordCardProps = {
  category: string;
  /** Only artists get the word; pass null to the bamboozler and the host screen, as the server will. */
  word: string | null;
  view: Role | "host";
};

/**
 * The secret, as little text as possible: a category chip and one big line. The bamboozler's line is small so it
 * doesn't stand out across the table; their sly logo (`BrandLogo sly`) tells them instead.
 */
export function RoomWordCard({ category, word, view }: RoomWordCardProps) {
  const line = view === "artist" && word ? word : view === "bamboozler" ? "You’re the bamboozler" : "Who’s sketchy?";
  return (
    <p className="flex flex-col items-center gap-1 text-center leading-none">
      <span className="rounded-full bg-night-soft px-2.5 py-1 text-xs text-white/80">
        <span className="sr-only">Category: </span>
        {category}
      </span>
      <span
        className={`relative px-2 font-display ${
          view === "artist"
            ? "text-3xl @4xl/room:text-4xl"
            : view === "bamboozler"
              ? "text-lg @4xl/room:text-xl"
              : "text-2xl @4xl/room:text-3xl"
        }`}
      >
        {view === "artist" && <span className="sr-only">Secret word: </span>}
        {line}
        <BrandScribble
          shape="underline"
          seed={line.length}
          className={`absolute inset-x-0 -bottom-2.5 h-3 w-full ${view === "bamboozler" ? "text-white/40" : "text-berry"}`}
        />
      </span>
    </p>
  );
}
