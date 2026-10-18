// Cleans brand/logo.svg and generates the web app icons and the fedora (hat.svg) from it.
// Run from the repo root: `node scripts/brand-icons.mjs` (or `--check` to only verify the icons are up to date).

import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { optimize } from "svgo";

const night = "#080357";
const logoPath = "brand/logo.svg";
const publicDir = "web/public";

const source = readFileSync(logoPath, "utf8");
// The exported logo carries a rounded-square path that lies entirely left of the viewBox; drop it.
const visible = source.replace(/<path d="M0,458\.416[^"]*"[^>]*\/>/, "");
const logo = optimize(visible, {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    "preset-default",
    "removeDimensions",
    "removeOffCanvasPaths",
    "removeXlink",
    "convertStyleToAttrs",
    { name: "removeAttrs", params: { elemSeparator: "#", attrs: ["svg#xml:space", "svg#version"] } },
  ],
}).data;

const rasterise = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size }, background: night }).render();
const render = (svg, size) => rasterise(svg, size).asPng();

const difference = pixelDifference(rasterise(source, 256).pixels, rasterise(logo, 256).pixels);
if (difference > 0.002) {
  throw new Error(`Optimised logo renders differently from the original (${(difference * 100).toFixed(2)}% of pixels)`);
}

const viewBox = logo.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 2250 2250";
const inner = logo.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
// The fedora alone, for the hat on players' faces: the logo's crown and brim without its navy square.
const background = /<path fill="#080357" d="M0 0h2250v2250H0z"\/>/;
if (!background.test(logo)) throw new Error("The logo's navy background square moved; update the hat crop");
const hat = logo.replace(background, "").replace(/viewBox="[^"]+"/, 'viewBox="380 250 1500 880"');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect width="2250" height="2250" fill="${night}"/><g transform="translate(225 225) scale(.8)">${inner}</g></svg>`;

const outputs = {
  [logoPath]: logo,
  [`${publicDir}/logo.svg`]: logo,
  [`${publicDir}/icon.svg`]: logo,
  [`${publicDir}/hat.svg`]: hat,
  [`${publicDir}/favicon.ico`]: ico([render(logo, 16), render(logo, 32)], [16, 32]),
  [`${publicDir}/apple-touch-icon.png`]: render(logo, 180),
  [`${publicDir}/icon-192.png`]: render(logo, 192),
  [`${publicDir}/icon-512.png`]: render(logo, 512),
  [`${publicDir}/icon-maskable-512.png`]: render(maskable, 512),
};

if (process.argv.includes("--check")) {
  const stale = Object.entries(outputs).filter(([path, content]) => {
    try {
      return !Buffer.from(content).equals(readFileSync(path));
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`Out of date, run node scripts/brand-icons.mjs: ${stale.map(([path]) => path).join(", ")}`);
    process.exit(1);
  }
} else {
  for (const [path, content] of Object.entries(outputs)) writeFileSync(path, content);
  console.log(`Wrote ${Object.keys(outputs).length} files; logo ${source.length} → ${logo.length} bytes`);
}

/** An .ico that embeds PNG images, which every browser that still asks for /favicon.ico understands. */
function ico(pngs, sizes) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(sizes[index] % 256, entry);
    header.writeUInt8(sizes[index] % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs]);
}

function pixelDifference(pixelsA, pixelsB) {
  if (pixelsA.length !== pixelsB.length) return 1;
  let different = 0;
  for (let index = 0; index < pixelsA.length; index += 4) {
    const delta =
      Math.abs(pixelsA[index] - pixelsB[index]) +
      Math.abs(pixelsA[index + 1] - pixelsB[index + 1]) +
      Math.abs(pixelsA[index + 2] - pixelsB[index + 2]);
    if (delta > 24) different++;
  }
  return different / (pixelsA.length / 4);
}
