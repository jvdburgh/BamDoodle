import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { BrandFlag, BrandSupportLine, supportLink } from "@/components/brand/BrandSupportLine.component";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { CanvasTools } from "@/components/canvas/_utils/canvasTools.utils";
import { APP_VERSION } from "@/protocol/version";

const MAKER_URL = "https://github.com/jvdburgh";
const RELEASE_URL = "https://github.com/jvdburgh/BamDoodle/releases/tag/";

const ink = (name: string) => CanvasTools.colours.find((colour) => colour.name === name)!.value;
const pen = (name: string, points: number[][]) => AvatarUtils.fromBox(points, ink(name));
const { loop, line } = ScribbleUtils;

/** The maker as a doodle: a side parting, round green glasses, a handlebar moustache and a smile. */
const makerAvatar = [
  pen("White", loop(1, { cx: 50, cy: 58, rx: 24, ry: 28, turns: 1.06, wobble: 0.06 })),
  pen("Sun", line(2, 40, 31, 26, 46, 2)),
  pen("Sun", line(3, 40, 31, 33, 44, 1)),
  pen("Sun", line(4, 40, 31, 74, 40, -7)),
  pen("Sun", line(5, 44, 33, 72, 46, -5)),
  pen("Lime", loop(6, { cx: 41, cy: 55, rx: 7.5, ry: 6.5, wobble: 0.03 })),
  pen("Lime", loop(7, { cx: 59, cy: 55, rx: 7.5, ry: 6.5, wobble: 0.03 })),
  pen("Lime", line(8, 48.5, 54, 51.5, 54, -1.5)),
  pen("White", loop(9, { cx: 41, cy: 55, rx: 1.6, ry: 1.9, wobble: 0 })),
  pen("White", loop(10, { cx: 59, cy: 55, rx: 1.6, ry: 1.9, wobble: 0 })),
  pen("Sun", line(11, 50, 66, 37, 68, 3)),
  pen("Sun", line(12, 50, 66, 63, 68, 3)),
  pen("Sun", line(13, 37, 68, 35, 64, 1)),
  pen("Sun", line(14, 63, 68, 65, 64, -1)),
  pen("White", line(15, 42, 72, 58, 72, 6)),
];

/** The start page's small print: who made it, where it runs, and the one thing we ask (donate to Ukraine). */
export function BrandFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 px-4 pt-2 pb-5 text-center leading-relaxed text-white/70">
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <span>Made by</span>
        <a
          href={MAKER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`group inline-flex items-center gap-1.5 ${supportLink}`}
        >
          <AvatarDoodle
            strokes={makerAvatar}
            backdrop={false}
            className="h-[1.2em] w-auto transition-transform motion-safe:group-hover:-rotate-12"
          />
          Joris van der Burgh
        </a>
        <span>
          in <BrandFlag emoji="🇳🇱" label="Dutch flag" /> the Netherlands
        </span>
        <span aria-hidden="true" className="text-white/40">
          /
        </span>
        <span>
          Hosted in the <BrandFlag emoji="🇪🇺" label="EU flag" /> European Union
        </span>
      </p>
      <BrandSupportLine />
      <p className="text-sm text-white/50">
        {APP_VERSION === "dev" ? (
          "Development build"
        ) : !APP_VERSION.startsWith("v") ? (
          `Version ${APP_VERSION}`
        ) : (
          <a href={RELEASE_URL + APP_VERSION} target="_blank" rel="noopener noreferrer" className={supportLink}>
            Version {APP_VERSION}
          </a>
        )}
      </p>
    </footer>
  );
}
