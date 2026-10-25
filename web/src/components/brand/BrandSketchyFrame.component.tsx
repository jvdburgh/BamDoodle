type BrandSketchyFrameProps = {
  /** A thicker, wobblier line, for "look here" (the spotlight). */
  bold?: boolean;
  /** The hat's colours, travelling slowly round: for the start page's main buttons. Ignores `text-*`. */
  rainbow?: boolean;
  /** Colour via `text-*` (the border uses `currentColor`); add `rounded-*` to match the parent. */
  className?: string;
};

/**
 * A hand-drawn-looking outline laid over its positioned parent. Only the border is filtered, never the content, so
 * text stays crisp. Needs BrandSketchFilter on the page.
 */
export function BrandSketchyFrame({ bold = false, rainbow = false, className = "" }: BrandSketchyFrameProps) {
  if (rainbow) {
    // The wobble goes on the outer span: filtered after the inner one's mask, so the ring itself wobbles.
    return (
      <span
        aria-hidden="true"
        className={`sketchy pointer-events-none absolute -inset-1 rounded-[inherit] ${className}`}
      >
        <span className="frame-rainbow absolute inset-0 rounded-[inherit] p-[3px]" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`sketchy pointer-events-none absolute rounded-[inherit] border-current ${bold ? "inset-1 border-4" : "-inset-px border-2"} ${className}`}
    />
  );
}
