type BrandSketchyFrameProps = {
  /** A thicker, wobblier line, for "look here" (the spotlight). */
  bold?: boolean;
  /** Colour via `text-*` (the border uses `currentColor`); add `rounded-*` to match the parent. */
  className?: string;
};

/**
 * A hand-drawn-looking outline laid over its positioned parent. Only the border is filtered, never the content, so
 * text stays crisp. Needs BrandSketchFilter on the page.
 */
export function BrandSketchyFrame({ bold = false, className = "" }: BrandSketchyFrameProps) {
  return (
    <span
      aria-hidden="true"
      className={`sketchy pointer-events-none absolute rounded-[inherit] border-current ${bold ? "inset-1 border-4" : "-inset-px border-2"} ${className}`}
    />
  );
}
