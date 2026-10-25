import { useEffect, useId, useState } from "react";
import { BrandSheet } from "@/components/brand/BrandSheet.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

type BrandLogoProps = {
  /** The logo's size. */
  className?: string;
  /** Makes the logo a link, usually home; with `named`, the name and tagline are part of the link too. */
  href?: string;
  /** The top-left of every screen: the logo with the name and tagline beside it. */
  named?: boolean;
  /**
   * Sizes the name and tagline (they scale together), e.g. bigger on the TV. To hide them on a narrow phone use
   * `sr-only`, never `hidden`: with `named` the picture is decorative, so the text is the link's name.
   */
  nameClassName?: string;
  /**
   * The bamboozler's own screen: the coat's collar goes up and the hat's colours swirl, twice per mount (key it by
   * round), a quiet static badge with reduced motion. The logo is inlined for that (it's an `<img>` otherwise), so its parts can move.
   */
  sly?: boolean;
  /** The start page: hovering turns the hat's colours one round, leaving turns them back (not with reduced motion). */
  swirlOnHover?: boolean;
  /** In a room, the link asks "Are you sure you want to leave the game?" first, with Stay and Leave. */
  confirmLeave?: boolean;
};

/** Fired on `window` when you confirm leaving the room, right before the page goes. */
export const LEAVING_EVENT = "bamdoodle:leaving";

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

export function BrandLogo({
  className,
  href,
  sly = false,
  swirlOnHover = false,
  named = false,
  nameClassName = "text-sm",
  confirmLeave = false,
}: BrandLogoProps) {
  const idPrefix = useId();
  const [askingToLeave, setAskingToLeave] = useState(false);
  const markup = useLogoMarkup(sly || swirlOnHover, idPrefix);
  // Beside the written name the picture adds nothing for a screen reader.
  const alt = named ? "" : "BamDoodle";
  const image = <img src="/logo.svg" alt={alt} className={sly ? "size-full" : `shrink-0 ${className ?? ""}`} />;
  const mark = sly ? (
    <span className={`relative block shrink-0 ${className ?? ""}`}>
      {markup ? (
        <>
          <span
            role={named ? undefined : "img"}
            aria-label={named ? undefined : "BamDoodle"}
            aria-hidden={named || undefined}
            className="logo-sly block size-full motion-reduce:hidden [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: markup }}
          />
          <img src="/logo.svg" alt={alt} className="hidden size-full motion-reduce:block" />
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
  ) : swirlOnHover && markup ? (
    <span
      role={named ? undefined : "img"}
      aria-label={named ? undefined : "BamDoodle"}
      aria-hidden={named || undefined}
      className={`logo-hover-swirl block shrink-0 [&>svg]:size-full ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  ) : (
    image
  );
  const content = named ? (
    <>
      {mark}
      <div className={`leading-tight ${nameClassName}`}>
        <p className="font-display text-[1.75em] leading-none">BamDoodle</p>
        <BrandTagline className="mt-0.5" />
      </div>
    </>
  ) : (
    mark
  );
  if (!href) return mark;
  return (
    <>
      <a
        href={href}
        title="Back to the start page"
        aria-haspopup={confirmLeave ? "dialog" : undefined}
        onClick={(event) => {
          // A new tab (a modifier, the middle button) leaves nothing.
          if (!confirmLeave || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          setAskingToLeave(true);
        }}
        className={`flex w-fit shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white`}
      >
        {content}
      </a>
      {askingToLeave && (
        <BrandSheet label="Leave the game?" onClose={() => setAskingToLeave(false)} question>
          <p className="text-center font-display text-2xl">Are you sure you want to leave the game?</p>
          <form method="dialog" className="flex flex-wrap justify-center gap-3">
            <button type="submit" className={BrandStyles.primaryButton}>
              Stay
            </button>
            <a
              href={href}
              // You said so already: the room drops its own "leave this page?" (`beforeunload`) before the page goes.
              onClick={() => window.dispatchEvent(new Event(LEAVING_EVENT))}
              className={BrandStyles.quietButton}
            >
              Leave
            </a>
          </form>
        </BrandSheet>
      )}
    </>
  );
}
