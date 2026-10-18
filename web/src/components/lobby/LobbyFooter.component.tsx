import { APP_VERSION } from "@/protocol/version";

const MAKER_URL = "https://github.com/jvdburgh";
const REPO_URL = "https://github.com/jvdburgh/BamDoodle";
const DONATE_URL = "https://u24.gov.ua/";
const RELEASE_URL = `${REPO_URL}/releases/tag/`;

const link =
  "rounded-sm underline decoration-white/30 underline-offset-3 hover:text-white hover:decoration-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** The start page's small print: who made it, where it runs, and how to help (the repo, and a good cause). */
export function LobbyFooter() {
  return (
    <footer className="flex flex-col items-center gap-1 px-4 pb-4 text-center text-xs leading-relaxed text-white/60">
      <p>
        Made by{" "}
        <a href={MAKER_URL} target="_blank" rel="noopener noreferrer" className={link}>
          Joris
        </a>{" "}
        in the Netherlands{" "}
        <span role="img" aria-label="Dutch flag">
          🇳🇱
        </span>{" "}
        and hosted{" "}
        <span className="whitespace-nowrap">
          in the EU{" "}
          <span role="img" aria-label="EU flag">
            🇪🇺
          </span>
        </span>
      </p>
      <p>
        Free and open source. To support this little game,{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={link}>
          contribute on GitHub
        </a>{" "}
        and please{" "}
        <span className="whitespace-nowrap">
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className={link}>
            donate to our friends in Ukraine
          </a>{" "}
          <span role="img" aria-label="Ukrainian flag">
            🇺🇦
          </span>
        </span>
      </p>
      <p>
        {APP_VERSION === "dev" ? (
          "Development build"
        ) : !APP_VERSION.startsWith("v") ? (
          `Version ${APP_VERSION}`
        ) : (
          <a href={RELEASE_URL + APP_VERSION} target="_blank" rel="noopener noreferrer" className={link}>
            Version {APP_VERSION}
          </a>
        )}
      </p>
    </footer>
  );
}
