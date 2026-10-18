const REPO_URL = "https://github.com/jvdburgh/BamDoodle";
const DONATE_URL = "https://u24.gov.ua/";

const link =
  "rounded-sm underline decoration-white/30 underline-offset-3 hover:text-white hover:decoration-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** The start page's small print: open source, and a nudge towards a good cause instead of us. */
export function LobbyFooter() {
  return (
    <footer className="flex flex-col items-center gap-1 px-4 pb-4 text-center text-xs leading-relaxed text-white/60">
      <p>
        Free and open source (AGPL).{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={link}>
          Help make it on GitHub
        </a>
      </p>
      <p>
        Nothing to buy. Got something to spare?{" "}
        <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className={link}>
          Donate to United24
        </a>
        , Ukraine’s official fundraising platform.
      </p>
    </footer>
  );
}
