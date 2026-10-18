type BrandSketchyFrameProps = {
  /** Colour via `text-*` (the border uses `currentColor`); add `rounded-*` to match the parent. */
  className?: string;
};

/**
 * A hand-drawn-looking outline laid over its positioned parent. Only the border is filtered, never the content, so
 * text stays crisp. Needs BrandSketchFilter on the page.
 */
export function BrandSketchyFrame({ className = "" }: BrandSketchyFrameProps) {
  return (
    <span
      aria-hidden="true"
      className={`sketchy pointer-events-none absolute -inset-px rounded-[inherit] border-2 border-current ${className}`}
    />
  );
}
