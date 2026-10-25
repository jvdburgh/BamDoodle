import { GameRoute } from "@/app/GameRoute";
import { WatchRoute } from "@/app/WatchRoute";
import { RouteUtils } from "@/app/route.utils";
import { BrandSketchFilter } from "@/components/brand/BrandSketchFilter.component";

/** Routes by path (`RouteUtils.route`): `/` and `/BKZW` play, `/watch/BKZW` is a host screen. */
export function App() {
  const route = RouteUtils.route(window.location.pathname);

  return (
    <>
      <BrandSketchFilter />
      <h1 className="sr-only">BamDoodle</h1>
      {route.kind === "watch" ? <WatchRoute code={route.code} /> : <GameRoute joinCode={route.code} />}
    </>
  );
}
