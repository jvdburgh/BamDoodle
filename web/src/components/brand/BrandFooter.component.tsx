import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandFlag, BrandLink, BrandSupportLine } from "@/components/brand/BrandSupportLine.component";
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

/** Which build this is: a link to its release notes for a tagged release. */
function Version() {
  if (APP_VERSION === "dev") return <>Development build {import.meta.env.VITE_BAMDOODLE_COMMIT ?? ""}</>;
  if (!APP_VERSION.startsWith("v")) return <>Version {APP_VERSION}</>;
  return <BrandLink href={RELEASE_URL + APP_VERSION}>Version {APP_VERSION}</BrandLink>;
}

/** A doodled line with three little stars in the hat's colours: where the page ends and the small print starts. */
function FooterDivider() {
  return (
    <div aria-hidden="true" className="mb-2 flex items-center gap-2">
      <BrandScribble shape="underline" seed={3} className="h-2.5 w-16 text-white/20 sm:w-24" />
      <BrandScribble shape="star" seed={1} className="size-3.5 -rotate-12 text-berry/80" />
      <BrandScribble shape="star" seed={2} className="size-4.5 -translate-y-0.5 text-sun/80" />
      <BrandScribble shape="star" seed={3} className="size-3.5 rotate-12 text-lagoon/80" />
      <BrandScribble shape="underline" seed={8} className="h-2.5 w-16 -scale-x-100 text-white/20 sm:w-24" />
    </div>
  );
}

/**
 * The small print: who made it, where it runs, the one thing we ask, and the version, under a doodled divider.
 * `support={false}` leaves the ask out where a page already makes it (The End's donate card).
 */
export function BrandFooter({ support = true }: { support?: boolean }) {
  return (
    <footer className="mt-10 flex flex-col items-center gap-1 px-4 pt-2 pb-3 text-center text-sm leading-relaxed text-white/75 md:mt-16 md:pt-4 md:pb-8">
      <FooterDivider />
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <span>Made by</span>
        <BrandLink href={MAKER_URL} className="group inline-flex items-center gap-1.5">
          <AvatarDoodle
            strokes={makerAvatar}
            backdrop={false}
            crop
            className="h-[1.2em] w-auto transition-transform motion-safe:group-hover:-rotate-12"
          />
          Joris van der Burgh
        </BrandLink>
        <span>
          in <BrandFlag country="nl" /> the Netherlands
        </span>
        <span aria-hidden="true" className="text-white/40 max-sm:hidden">
          /
        </span>
        <span>
          Hosted in the <BrandFlag country="eu" /> European Union
        </span>
      </p>
      {support && <BrandSupportLine />}
      <p className="text-xs text-white/60">
        <Version />
      </p>
    </footer>
  );
}
