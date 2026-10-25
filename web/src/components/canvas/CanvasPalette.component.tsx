import { BrandScribble } from "@/components/brand/BrandScribble.component";
import type { CanvasColour } from "@/components/canvas/_utils/canvasTools.utils";

type CanvasPaletteProps = {
  colours: CanvasColour[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /**
   * In a narrow spot (under 32rem, like a phone's bottom bar), one row that scrolls sideways and fades out at the
   * right edge, so it reads as more to come; wrapping with room.
   */
  rowWhenNarrow?: boolean;
};

const blobs = ["rounded-[46%_54%_52%_48%]", "rounded-[55%_45%_48%_52%]", "rounded-[50%_50%_44%_56%]"];

/** Colour swatches as a radio group, each a comfortable 44 px or more to tap with the gaps; they wrap to fill the width. */
export function CanvasPalette({
  colours,
  value,
  onChange,
  disabled = false,
  rowWhenNarrow = false,
}: CanvasPaletteProps) {
  return (
    <fieldset disabled={disabled} className="@container/palette min-w-0 disabled:opacity-40">
      <legend className="sr-only">Colour</legend>
      <div
        className={`grid gap-1 ${
          rowWhenNarrow
            ? "@max-lg/palette:-mx-1 @max-lg/palette:snap-x @max-lg/palette:auto-cols-[2.75rem] @max-lg/palette:grid-flow-col @max-lg/palette:overflow-x-auto @max-lg/palette:overscroll-x-contain @max-lg/palette:py-0.5 @max-lg/palette:pr-8 @max-lg/palette:pl-1 @max-lg/palette:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] @max-lg/palette:[scrollbar-width:none] @lg/palette:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))]"
            : `grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] ${colours.length <= 5 ? "max-w-72" : ""}`
        }`}
      >
        {colours.map((colour, index) => (
          <label
            key={colour.value}
            className="relative grid aspect-square snap-start cursor-pointer place-items-center"
          >
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
              className={`size-[76%] ring-1 ring-white/25 transition-transform peer-checked:scale-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-white hover:scale-110 ${blobs[index % blobs.length]}`}
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
