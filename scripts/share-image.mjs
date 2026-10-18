// Renders the link preview card (web/public/share.png, 1200×630) from the logo, the brand fonts and colours.
// Run from the repo root after `just setup`: `node scripts/share-image.mjs` (`just share-image`).

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const web = path.resolve(import.meta.dirname, "../web");
const { chromium } = createRequire(path.join(web, "package.json"))("playwright");
const file = (relative) => pathToFileURL(path.join(web, relative)).href;

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Display; src: url(${file("node_modules/@fontsource/love-ya-like-a-sister/files/love-ya-like-a-sister-latin-400-normal.woff2")}); }
@font-face { font-family: Body; font-weight: 100 900; src: url(${file("node_modules/@fontsource-variable/work-sans/files/work-sans-latin-wght-normal.woff2")}); }
html, body { margin: 0; width: 1200px; height: 630px; background: #080357; color: #fff; }
.card { display: flex; align-items: center; gap: 56px; height: 100%; padding: 0 96px; box-sizing: border-box; }
img { width: 330px; height: 330px; flex: none; }
h1 { font: 136px/1 Display; margin: 0 0 18px; }
.tagline { font: 44px Body; color: rgb(255 255 255 / 75%); margin: 0 0 34px; }
.tagline b { color: #f13866; font-weight: 400; }
.what { font: 500 34px/1.3 Body; color: #fbb03b; margin: 0; max-width: 600px; }
</style>
<div class="card">
  <img src="${file("public/logo.svg")}" alt="">
  <div>
    <h1>BamDoodle</h1>
    <p class="tagline">Draw <b>•</b> Guess <b>•</b> Deceive</p>
    <p class="what">A party game to play online:<br>find out who’s sketchy</p>
  </div>
</div>`;

// A file page, so it may load the fonts and the logo from disk.
const dir = mkdtempSync(path.join(tmpdir(), "bamdoodle-share-"));
writeFileSync(path.join(dir, "card.html"), html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(path.join(dir, "card.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(web, "public/share.png") });
await browser.close();
rmSync(dir, { recursive: true });
console.log("wrote web/public/share.png");
