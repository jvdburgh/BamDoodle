import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { CanvasBrush } from "@/components/canvas/_utils/canvasTools.utils";

type CanvasBrushPickerProps = {
  brushes: CanvasBrush[];
  value: number;
  onChange: (size: number) => void;
  /** The current colour, so the preview dots show what you will draw. */
  color: string;
  disabled?: boolean;
};

/** The pen sizes as one small segmented group, the current colour in each preview dot. */
export function CanvasBrushPicker({ brushes, value, onChange, color, disabled = false }: CanvasBrushPickerProps) {
  const largest = Math.max(...brushes.map((brush) => brush.size));
  return (
    <fieldset
      disabled={disabled}
      className="flex shrink-0 items-center rounded-[14px_18px_16px_12px] bg-night p-0.5 ring-1 ring-white/15 disabled:opacity-40"
    >
      <legend className="sr-only">Brush size</legend>
      {brushes.map((brush, index) => (
        <label key={brush.name} className="relative grid size-11 cursor-pointer place-items-center">
          <input
            type="radio"
            name="canvas-brush"
            value={brush.size}
            checked={brush.size === value}
            onChange={() => onChange(brush.size)}
            aria-label={brush.name}
            className="peer sr-only"
          />
          <span className="grid size-8 place-items-center rounded-full bg-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
            <span
              style={{ backgroundColor: color, width: `${(brush.size / largest) * 75}%` }}
              className="aspect-square rounded-full ring-1 ring-night/15"
            />
          </span>
          {brush.size === value && (
            <BrandScribble
              shape="ring"
              seed={index + 11}
              weight={2.2}
              className="pointer-events-none absolute inset-0 size-full text-sun"
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}
