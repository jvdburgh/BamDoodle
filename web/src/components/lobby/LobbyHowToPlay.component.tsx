import { useId } from "react";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { HowToPlayUtils } from "@/components/lobby/_utils/howToPlay.utils";

type Card = (typeof HowToPlayUtils.steps)[number];

/** One card: a doodle on the left, a title and a line or two beside it, slightly askew. */
function LobbyHowToPlayCard({ card, tilt }: { card: Card; tilt: "left" | "right" }) {
  return (
    <li
      className={`relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-4 ${tilt === "right" ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}
    >
      <BrandSketchyFrame className="text-white/20" />
      <span className="row-span-2 grid size-16 place-items-center self-start rounded-full bg-night-deep text-sun">
        {card.icon === "hat" ? (
          <img src="/hat.svg" alt="" className="w-11" />
        ) : (
          <BrandScribble shape={card.icon} className="size-10" />
        )}
      </span>
      <h3 className="font-display text-xl">{card.title}</h3>
      <p className="text-white/80">{card.text}</p>
    </li>
  );
}

/**
 * The rules in six cards: three steps, then the points, the rounds and what you need. Under the start page's buttons
 * (a column on a phone, two rows of three on a laptop) and behind the room's "?" button. Also what search engines read.
 */
export function LobbyHowToPlay() {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="@container/howto mx-auto grid w-full max-w-xl content-start gap-6 px-5 py-10 lg:max-w-6xl lg:px-8"
    >
      <h2 id={headingId} className="font-display text-4xl">
        How to play
      </h2>
      <ol className="grid gap-4 @3xl/howto:grid-cols-3">
        {HowToPlayUtils.steps.map((card, index) => (
          <LobbyHowToPlayCard key={card.title} card={card} tilt={index % 2 ? "right" : "left"} />
        ))}
      </ol>
      <ul className="grid gap-4 @3xl/howto:grid-cols-3">
        {HowToPlayUtils.more.map((card, index) => (
          <LobbyHowToPlayCard key={card.title} card={card} tilt={index % 2 ? "left" : "right"} />
        ))}
      </ul>
    </section>
  );
}
