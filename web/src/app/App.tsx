import { GameRoute } from "@/app/GameRoute";
import { WatchRoute } from "@/app/WatchRoute";
import { BrandSketchFilter } from "@/components/brand/BrandSketchFilter.component";
import { LabApp } from "@/components/lab/LabApp.component";

/** Routes by path: `/` and `/join/CODE` play, `/watch/CODE` is a host screen, `/lab` the game without a server. */
export function App() {
  const [, first = "", second = ""] = window.location.pathname.split("/");
  const code = second.toUpperCase();

  return (
    <>
      <BrandSketchFilter />
      <h1 className="sr-only">BamDoodle</h1>
      {first === "lab" ? (
        <LabApp />
      ) : first === "watch" && code ? (
        <WatchRoute code={code} />
      ) : (
        <GameRoute joinCode={first === "join" ? code : undefined} />
      )}
    </>
  );
}
