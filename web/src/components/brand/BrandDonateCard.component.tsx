import { useId } from "react";
import { BrandFlag, BrandLink, DONATE_URL, REPO_URL } from "@/components/brand/BrandSupportLine.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

/** At the end of a game, the one thing we ask for: support Ukrainian citizens (and help out on GitHub). */
export function BrandDonateCard() {
  const headingId = useId();
  return (
    <aside
      aria-labelledby={headingId}
      className="grid w-full max-w-md justify-items-center gap-2 rounded-[14px_18px_16px_12px] bg-night-deep/70 px-5 py-4 text-center"
    >
      <h3 id={headingId} className="font-display text-xl">
        Did you enjoy the game?
      </h3>
      <p className="text-white/80">
        BamDoodle is free, with no ads and no accounts. If you had fun, please consider supporting{" "}
        <BrandFlag country="ua" /> Ukrainian citizens.
      </p>
      <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className={`${BrandStyles.quietButton} mt-1`}>
        Donate through United24
      </a>
      <p className="text-sm text-white/70">
        Or <BrandLink href={REPO_URL}>help out on GitHub</BrandLink>.
      </p>
    </aside>
  );
}
