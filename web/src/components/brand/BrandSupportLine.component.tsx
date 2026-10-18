const REPO_URL = "https://github.com/jvdburgh/BamDoodle";
/** United24, Ukraine's official fundraising platform. */
const DONATE_URL = "https://u24.gov.ua/";

export const supportLink =
  "rounded-sm underline decoration-white/40 underline-offset-3 hover:text-white hover:decoration-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function BrandFlag({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span role="img" aria-label={label}>
      {emoji}
    </span>
  );
}

/** What we ask, the same words in the start page's footer and after the last round. */
export function BrandSupportLine({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      Enjoying BamDoodle?{" "}
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={supportLink}>
        Help out on GitHub
      </a>
      , and please{" "}
      <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className={supportLink}>
        donate to our friends in Ukraine
      </a>{" "}
      <BrandFlag emoji="🇺🇦" label="Ukrainian flag" />
    </p>
  );
}
