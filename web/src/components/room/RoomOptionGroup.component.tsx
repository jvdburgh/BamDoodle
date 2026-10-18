export type RoomOption<T extends string> = { value: T; name: string; description: string };

type RoomOptionGroupProps<T extends string> = {
  legend: string;
  /** Radio group name; unique per page. */
  name: string;
  options: RoomOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A room setting as a row of cards, one per choice (turn mode, devices). */
export function RoomOptionGroup<T extends string>({ legend, name, options, value, onChange }: RoomOptionGroupProps<T>) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1.5 text-sm text-white/70">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="group relative cursor-pointer rounded-[12px_16px_14px_10px] bg-night-deep/60 p-3 text-left text-white ring-2 ring-transparent transition-colors has-checked:bg-night-deep has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-sun hover:bg-night-deep"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <span className="block font-display text-lg font-bold group-has-checked:text-sun">{option.name}</span>
          <span className="block text-sm text-white/70">{option.description}</span>
        </label>
      ))}
    </fieldset>
  );
}
