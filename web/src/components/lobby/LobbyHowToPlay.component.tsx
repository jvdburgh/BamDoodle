import { useId } from "react";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { HowToPlayUtils } from "@/components/lobby/_utils/howToPlay.utils";

/**
 * The rules in three steps, the points and a few questions: under the start page's buttons on a phone, beside them on
 * a laptop. For new players and for search engines.
 */
export function LobbyHowToPlay() {
  const headingId = useId();
  const pointsId = useId();
  return (
    <section aria-labelledby={headingId} className="mx-auto grid w-full max-w-xl content-start gap-8 px-5 py-12">
      <h2 id={headingId} className="font-display text-4xl">
        How to play
      </h2>
      <ol className="grid gap-4">
        {HowToPlayUtils.steps.map((step, index) => (
          <li
            key={step.title}
            className={`relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-4 ${index === 1 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}
          >
            <BrandSketchyFrame className="text-white/20" />
            <span className="row-span-2 grid size-16 place-items-center rounded-full bg-night-deep text-sun">
              {step.icon === "hat" ? (
                <img src="/hat.svg" alt="" className="w-11" />
              ) : (
                <BrandScribble shape={step.icon} className="size-10" />
              )}
            </span>
            <h3 className="font-display text-xl">{step.title}</h3>
            <p className="text-white/80">{step.text}</p>
          </li>
        ))}
      </ol>
      <div className="grid gap-8">
        <section aria-labelledby={pointsId} className="grid content-start gap-2">
          <h3 id={pointsId} className="font-display text-2xl">
            Points
          </h3>
          <ul className="grid gap-1.5 text-white/80">
            {HowToPlayUtils.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="text-white/80">
            A game is a few rounds, each with a new word and a new bamboozler. Most points wins.
          </p>
        </section>
        <dl className="grid content-start gap-4">
          {HowToPlayUtils.questions.map(({ question, answer }) => (
            <div key={question} className="grid gap-1">
              <dt className="font-display text-xl">{question}</dt>
              <dd className="text-white/80">{answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
