import { useId } from "react";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LobbyCategoryPickerProps = {
  /** The categories in the room's language. */
  categories: WordCategory[];
  selected: string[];
  onChange: (names: string[]) => void;
};

/** Which word categories are in play, as chips. 18+ ones are marked and never pre-ticked. */
export function LobbyCategoryPicker({ categories, selected, onChange }: LobbyCategoryPickerProps) {
  const hintId = useId();
  const chosen = new Set(selected);
  const family = categories.filter((category) => !category.adult).map((category) => category.name);
  const toggle = (name: string) =>
    onChange(chosen.has(name) ? selected.filter((other) => other !== name) : [...selected, name]);

  return (
    <fieldset aria-describedby={hintId}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <legend className="text-sm text-white/70">Categories</legend>
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
            className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-night-deep px-2.5 py-0.5 text-sm ring-2 ring-transparent has-checked:bg-night has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input
              type="checkbox"
              checked={chosen.has(category.name)}
              onChange={() => toggle(category.name)}
              aria-label={category.adult ? `${category.name} (18+)` : category.name}
              className="sr-only"
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
