import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";

type CanvasPaletteProps = {
  colours: CanvasColour[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const blobs = ["rounded-[46%_54%_52%_48%]", "rounded-[55%_45%_48%_52%]", "rounded-[50%_50%_44%_56%]"];

/** Colour swatches as a radio group. The full palette wraps to two rows, or one row when there's room. */
export function CanvasPalette({ colours, value, onChange, disabled = false }: CanvasPaletteProps) {
  const columns = colours.length > 10 ? "grid-cols-10 @2xl:grid-cols-20" : "max-w-64 grid-cols-5";
  return (
    <fieldset disabled={disabled} className="@container min-w-0 disabled:opacity-40">
      <legend className="sr-only">Colour</legend>
      <div className={`grid gap-1 ${columns}`}>
        {colours.map((colour, index) => (
          <label key={colour.value} className="relative grid aspect-square cursor-pointer place-items-center">
            <input
              type="radio"
              name="canvas-colour"
              value={colour.value}
              checked={colour.value === value}
              onChange={() => onChange(colour.value)}
              aria-label={colour.name}
              className="peer sr-only"
            />
            <span
              style={{ backgroundColor: colour.value }}
              className={`size-[72%] ring-1 ring-white/25 transition-transform peer-checked:scale-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-white hover:scale-110 ${blobs[index % blobs.length]}`}
            />
            {colour.value === value && (
              <BrandScribble
                shape="ring"
                seed={index + 3}
                weight={2.2}
                className="pointer-events-none absolute inset-0 size-full text-sun"
              />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
