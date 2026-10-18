import { useEffect, useId, useState } from "react";

type BrandLogoProps = {
  className?: string;
  /** Makes the logo a link, usually home. */
  href?: string;
  /**
   * The bamboozler's own screen: the coat's collar goes up and the hat's colours swirl, twice per mount (key it by
   * round), a quiet static badge with reduced motion. The logo is inlined for that (it's an `<img>` otherwise), so its parts can move.
   */
  sly?: boolean;
};

let logoMarkup: Promise<string> | undefined;

/** Fetched once from the same file the `<img>` shows; ids made unique so two inline logos don't share a clip path. */
function useLogoMarkup(enabled: boolean, idPrefix: string) {
  const [markup, setMarkup] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    logoMarkup ??= fetch("/logo.svg").then((response) => response.text());
    void logoMarkup.then((svg) => {
      if (current)
        setMarkup(svg.replace(/id="(\w+)"/g, `id="${idPrefix}$1"`).replace(/url\(#(\w+)\)/g, `url(#${idPrefix}$1)`));
    });
    return () => {
      current = false;
    };
  }, [enabled, idPrefix]);
  return markup;
}

export function BrandLogo({ className, href, sly = false }: BrandLogoProps) {
  const idPrefix = useId();
  const markup = useLogoMarkup(sly, idPrefix);
  const size = href || sly ? "size-full" : className;
  const image = <img src="/logo.svg" alt="BamDoodle" className={size} />;
  const logo = sly ? (
    <span className={`relative block ${href ? "size-full" : (className ?? "")}`}>
      {markup ? (
        <>
          <span
            role="img"
            aria-label="BamDoodle"
            className="logo-sly block size-full motion-reduce:hidden [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: markup }}
          />
          <img src="/logo.svg" alt="BamDoodle" className="hidden size-full motion-reduce:block" />
        </>
      ) : (
        image
      )}
      <span
        aria-hidden="true"
        className="absolute -right-1 -bottom-1 hidden size-[38%] place-items-center rounded-full bg-night-soft font-display text-[0.6em] leading-none text-white/70 ring-2 ring-night motion-reduce:grid"
      >
        ?
      </span>
    </span>
  ) : (
    image
  );
  if (!href) return logo;
  return (
    <a
      href={href}
      title="Back to the start page"
      className={`block shrink-0 rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${className ?? ""}`}
    >
      {logo}
    </a>
  );
}
