import { useId } from "react";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LobbyCategoryPickerProps = {
  /** The categories in the room's language. */
  categories: WordCategory[];
  selected: string[];
  onChange: (names: string[]) => void;
};

/** Which word categories are in play, as chips: picked ones framed with a ✓. 18+ ones are marked and never pre-ticked. */
export function LobbyCategoryPicker({ categories, selected, onChange }: LobbyCategoryPickerProps) {
  const hintId = useId();
  const legendId = useId();
  const chosen = new Set(selected);
  const family = categories.filter((category) => !category.adult).map((category) => category.name);
  const toggle = (name: string) =>
    onChange(chosen.has(name) ? selected.filter((other) => other !== name) : [...selected, name]);

  return (
    <fieldset aria-labelledby={legendId} aria-describedby={hintId}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <legend id={legendId} className="text-sm text-white/70">
          Categories{" "}
          <span className="text-white">
            ({selected.length} of {categories.length} selected)
          </span>
        </legend>
        <span className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => onChange([...new Set([...selected, ...family])])}
            className="text-sun underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-white/70 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Clear
          </button>
        </span>
      </div>
      {/* On a laptop the list scrolls in place, so the setup fits one screen whatever the number of categories. */}
      <div className="relative -m-1 flex flex-wrap gap-1.5 p-1 md:max-h-[max(8rem,min(19rem,calc(100svh-26rem)))] md:overflow-y-auto">
        {categories.map((category) => (
          <label
            key={category.name}
            className="group relative flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-night-deep py-1 pr-3 pl-2 text-sm text-white/70 hover:text-white has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <BrandSketchyFrame whenChecked className="text-sun" />
            <input
              type="checkbox"
              checked={chosen.has(category.name)}
              onChange={() => toggle(category.name)}
              aria-label={category.adult ? `${category.name} (18+)` : category.name}
              className="sr-only"
            />
            <BrandScribble
              shape={chosen.has(category.name) ? "check" : "plus"}
              seed={category.name.length}
              className={`size-4 shrink-0 ${chosen.has(category.name) ? "text-sun" : "text-white/50"}`}
            />
            <span className="font-display leading-none">{category.name}</span>
            {category.adult && (
              <span className="rounded-full bg-berry px-1.5 text-xs font-semibold text-night">18+</span>
            )}
          </label>
        ))}
      </div>
      <p id={hintId} className="text-sm text-white/70 not-empty:mt-1.5" aria-live="polite">
        {selected.length === 0 && "Pick at least one category."}
      </p>
    </fieldset>
  );
}
