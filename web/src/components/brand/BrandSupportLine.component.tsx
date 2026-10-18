import type { ReactNode } from "react";

const REPO_URL = "https://github.com/jvdburgh/BamDoodle";
/** United24, Ukraine's official fundraising platform. */
const DONATE_URL = "https://u24.gov.ua/";

const flags = {
  nl: { emoji: "🇳🇱", label: "Dutch flag" },
  eu: { emoji: "🇪🇺", label: "EU flag" },
  ua: { emoji: "🇺🇦", label: "Ukrainian flag" },
};

/** A plain underlined link that opens in a new tab: the footer's and the support line's links. */
export function BrandLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-sm underline decoration-white/40 underline-offset-3 hover:text-white hover:decoration-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
    >
      {children}
    </a>
  );
}

export function BrandFlag({ country }: { country: keyof typeof flags }) {
  const { emoji, label } = flags[country];
  return (
    <span role="img" aria-label={label}>
      {emoji}
    </span>
  );
}

/** What we ask, the same words in the start page's footer and after the last round. */
export function BrandSupportLine({ className = "" }: { className?: string }) {
  const github = <BrandLink href={REPO_URL}>Help out on GitHub</BrandLink>;
  const donate = <BrandLink href={DONATE_URL}>donate to our friends in Ukraine</BrandLink>;
  return (
    <p className={className}>
      Enjoying BamDoodle? {github}, and please {donate} <BrandFlag country="ua" />
    </p>
  );
}
