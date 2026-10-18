const REPO_URL = "https://github.com/jvdburgh/BamDoodle";
const DONATE_URL = "https://u24.gov.ua/";

const link =
  "rounded-sm underline decoration-white/30 underline-offset-3 hover:text-white hover:decoration-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** The start page's small print: who made it, where it runs, and how to help (the repo, and a good cause). */
export function LobbyFooter() {
  return (
    <footer className="flex flex-col items-center gap-1 px-4 pb-4 text-center text-xs leading-relaxed text-white/60">
      <p>
        Made by Joris in the Netherlands{" "}
        <span role="img" aria-label="Dutch flag">
          🇳🇱
        </span>{" "}
        and hosted in the EU. Free and open source.
      </p>
      <p>
        To support this little game,{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={link}>
          contribute on GitHub
        </a>{" "}
        and please{" "}
        <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className={link}>
          donate to our friends in Ukraine
        </a>{" "}
        <span role="img" aria-label="Ukrainian flag">
          🇺🇦
        </span>
      </p>
    </footer>
  );
}
