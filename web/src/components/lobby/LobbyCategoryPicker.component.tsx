import { useId } from "react";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LobbyCategoryPickerProps = {
  /** The categories in the room's language. */
  categories: WordCategory[];
  selected: string[];
  onChange: (names: string[]) => void;
};

/** Which word categories are in play, as chips with their word count. 18+ ones are marked and never pre-ticked. */
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
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <label
            key={category.name}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night-deep py-1 pr-2 pl-3.5 ring-2 ring-transparent has-checked:bg-night has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input
              type="checkbox"
              checked={chosen.has(category.name)}
              onChange={() => toggle(category.name)}
              className="sr-only"
            />
            <span className="font-display text-lg leading-none">{category.name}</span>
            {category.adult && (
              <span className="rounded-full bg-berry px-1.5 text-xs font-semibold text-night">18+</span>
            )}
            <span className="rounded-full bg-night-soft px-2 text-xs text-white/80">
              {category.words}
              <span className="sr-only"> words</span>
            </span>
          </label>
        ))}
      </div>
      <p id={hintId} className="mt-1.5 text-sm text-white/70" aria-live="polite">
        {selected.length === 0
          ? "Pick at least one category."
          : `${selected.length} of ${categories.length} picked. 18+ ones only when you tick them.`}
      </p>
    </fieldset>
  );
}
