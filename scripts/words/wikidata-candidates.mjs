// Fetches word candidates for the media and world packs from Wikidata (CC0), ranked by popularity.
// Popularity is the number of Wikipedia/Wikimedia sitelinks (wikibase:sitelinks): the more language editions write
// about something, the better known it is. A human curates the candidates into words/<lang>/*.toml; nothing here
// writes word files.
//
// Run from the repo root:
//   node scripts/words/wikidata-candidates.mjs <out-dir> [query-name ...]
// Writes <out-dir>/<name>.json (raw SPARQL response) and <out-dir>/<name>.tsv (one candidate per line, most popular
// first: qid, sitelinks, year or population, English label, Dutch label, enwiki title, nlwiki title, Dutch aliases).
// Keep <out-dir> outside the repo; the raw downloads are not committed.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const endpoint = "https://query.wikidata.org/sparql";
const userAgent = "BamDoodle word lists (open-source game; github.com/jvdburgh/BamDoodle)";

// Item kinds by Wikidata class.
const films = "wd:Q11424 wd:Q24869 wd:Q29168811 wd:Q202866 wd:Q20650540";
const filmSeries = "wd:Q24856 wd:Q196600";
const tvSeries = "wd:Q5398426 wd:Q15416 wd:Q1259759 wd:Q1366112 wd:Q526877";
const animatedSeries = "wd:Q581714 wd:Q117467246 wd:Q63952888";
const cartoonCharacters = "wd:Q15711870 wd:Q1114461 wd:Q838795 wd:Q14406742 wd:Q1760610 wd:Q21198342";
const games = "wd:Q7889 wd:Q7058673";
const fictionalCharacters = `${cartoonCharacters} wd:Q95074 wd:Q15632617 wd:Q3658341 wd:Q15773317 wd:Q15773347`;
const lowCountries = "wd:Q55 wd:Q31 wd:Q29999";

const list = (classes) => classes.split(" ");

// Each candidate set: the classes an item is an instance of (P31), an optional extra pattern on ?item, the minimum
// number of sitelinks and how many of the most popular to keep. Queried one class at a time to stay under the
// endpoint's 60-second limit, then labelled in batches.
const queries = {
  films: { classes: list(films), minSitelinks: 40, limit: 1200, extra: "year" },
  "film-series": { classes: list(filmSeries), minSitelinks: 25, limit: 800, extra: "year" },
  "tv-series": {
    classes: list(tvSeries),
    where: `FILTER NOT EXISTS { VALUES ?animated { ${animatedSeries} } ?item wdt:P31 ?animated. }`,
    minSitelinks: 25,
    limit: 800,
    extra: "year",
  },
  "animated-series": { classes: list(animatedSeries), minSitelinks: 20, limit: 800, extra: "year" },
  "cartoon-characters": { classes: list(cartoonCharacters), minSitelinks: 20, limit: 800, extra: "year" },
  "video-games": { classes: list(games), minSitelinks: 30, limit: 1000, extra: "year" },
  // Dutch and Flemish: few sitelinks abroad, so a low bar, but an article on the Dutch Wikipedia is required.
  "low-countries-tv": {
    classes: list(`${tvSeries} ${animatedSeries}`),
    where: `VALUES ?country { ${lowCountries} } ?item wdt:P495 ?country.`,
    minSitelinks: 2,
    limit: 800,
    extra: "year",
    nlwiki: true,
  },
  "low-countries-characters": {
    classes: list(fictionalCharacters),
    where: `{ VALUES ?country { ${lowCountries} } ?item wdt:P495 ?country. }
      UNION { ?item wdt:P170 ?creator. VALUES ?country { ${lowCountries} } ?creator wdt:P27 ?country. }`,
    minSitelinks: 2,
    limit: 600,
    extra: "year",
    nlwiki: true,
  },
  // Dutch-language works and characters, whatever their country property says.
  "dutch-language-media": {
    classes: list(`${tvSeries} ${animatedSeries} ${fictionalCharacters}`),
    where: "?item wdt:P407|wdt:P364 wd:Q7411.",
    minSitelinks: 2,
    limit: 800,
    extra: "year",
    nlwiki: true,
  },
  "low-countries-films": {
    classes: list(films),
    where: `VALUES ?country { ${lowCountries} } ?item wdt:P495 ?country.`,
    minSitelinks: 8,
    limit: 400,
    extra: "year",
    nlwiki: true,
  },
  countries: {
    classes: ["wd:Q3624078"],
    where: "FILTER NOT EXISTS { ?item wdt:P576 [] }",
    minSitelinks: 0,
    limit: 300,
    extra: "population",
  },
  cities: { classes: list("wd:Q1637706 wd:Q5119 wd:Q1549591"), minSitelinks: 120, limit: 600, extra: "population" },
  "dutch-cities": { classes: ["wd:Q2039348"], minSitelinks: 0, limit: 400, extra: "population" },
  "flemish-cities": { classes: ["wd:Q493522"], where: "?item wdt:P17 wd:Q31.", minSitelinks: 0, limit: 300, extra: "population" },
};

const popularQuery = (type, { where = "", minSitelinks, nlwiki }) => `SELECT DISTINCT ?item ?sl WHERE {
  ?item wdt:P31 ${type}.
  ${where}
  ${nlwiki ? "?nlwikiRequired schema:about ?item; schema:isPartOf <https://nl.wikipedia.org/>." : ""}
  ?item wikibase:sitelinks ?sl.
  FILTER(?sl >= ${minSitelinks})
}`;

function detailsQuery(items, extra) {
  const extraSelect = extra === "population" ? "(MAX(?pop) AS ?extra)" : "(MIN(YEAR(?date)) AS ?extra)";
  const extraPattern =
    extra === "population" ? "OPTIONAL { ?item wdt:P1082 ?pop }" : "OPTIONAL { ?item wdt:P577|wdt:P580 ?date }";
  // Labels the same in every language now live under "mul" instead of "en"/"nl", so fall back to it.
  return `SELECT ?item ?en ?nl ?enwiki ?nlwiki ${extraSelect}
  (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?nlAliases) WHERE {
  VALUES ?item { ${items.join(" ")} }
  OPTIONAL { ?item rdfs:label ?mul. FILTER(LANG(?mul) = "mul") }
  OPTIONAL { ?item rdfs:label ?enOwn. FILTER(LANG(?enOwn) = "en") }
  OPTIONAL { ?item rdfs:label ?nlOwn. FILTER(LANG(?nlOwn) = "nl") }
  BIND(COALESCE(?enOwn, ?mul) AS ?en)
  BIND(COALESCE(?nlOwn, ?mul) AS ?nl)
  OPTIONAL { ?enA schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?enwiki. }
  OPTIONAL { ?nlA schema:about ?item; schema:isPartOf <https://nl.wikipedia.org/>; schema:name ?nlwiki. }
  OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) = "nl") }
  ${extraPattern}
} GROUP BY ?item ?en ?nl ?enwiki ?nlwiki`;
}

async function run(name, query) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ query }),
    });
    if (response.ok) return response.json();
    const retry = response.status === 429 || response.status >= 500;
    if (!retry || attempt >= 4) {
      throw new Error(`${name}: ${response.status} ${(await response.text()).slice(0, 500)}`);
    }
    const wait = Number(response.headers.get("retry-after") ?? 0) * 1000 || attempt * 10_000;
    console.error(`${name}: ${response.status}, retrying in ${wait / 1000}s`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

const [outDir, ...only] = process.argv.slice(2);
if (!outDir) {
  console.error("usage: node scripts/words/wikidata-candidates.mjs <out-dir> [query-name ...]");
  console.error("       node scripts/words/wikidata-candidates.mjs <out-dir> --lookup <en|nl> <titles-file>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const field = (binding, key) => (binding[key]?.value ?? "").replace(/[\t\n]/g, " ");
const qid = (binding) => field(binding, "item").replace("http://www.wikidata.org/entity/", "");
const pause = () => new Promise((resolve) => setTimeout(resolve, 1500));

// Lookup mode: check reviewer-proposed words against Wikidata by a Wikipedia article title, to confirm the thing exists
// and see how well known it is (sitelinks). Each line of <titles-file> is "word<TAB>article title" (or just a title).
// Writes <out-dir>/lookup-<file>.tsv; titles not found are printed.
if (only[0] === "--lookup") {
  const [, wiki, file] = only;
  const { readFileSync } = await import("node:fs");
  const { basename } = await import("node:path");
  const entries = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split("\t").map((part) => part.trim());
      return { word: parts[0], title: parts.at(-1) };
    });
  const titles = [...new Set(entries.map(({ title }) => title))];
  const items = new Map();
  for (let start = 0; start < titles.length; start += 150) {
    const values = titles
      .slice(start, start + 150)
      .map((title) => JSON.stringify(title) + `@${wiki}`)
      .join(" ");
    const result = await run("lookup", `SELECT ?title ?item ?sl ?en ?nl WHERE {
  VALUES ?title { ${values} }
  ?article schema:name ?title; schema:isPartOf <https://${wiki}.wikipedia.org/>; schema:about ?item.
  ?item wikibase:sitelinks ?sl.
  OPTIONAL { ?item rdfs:label ?mul. FILTER(LANG(?mul) = "mul") }
  OPTIONAL { ?item rdfs:label ?enOwn. FILTER(LANG(?enOwn) = "en") }
  OPTIONAL { ?item rdfs:label ?nlOwn. FILTER(LANG(?nlOwn) = "nl") }
  BIND(COALESCE(?enOwn, ?mul) AS ?en)
  BIND(COALESCE(?nlOwn, ?mul) AS ?nl)
}`);
    for (const binding of result.results.bindings) {
      items.set(field(binding, "title"), [qid(binding), ...["sl", "en", "nl"].map((key) => field(binding, key))]);
    }
    await pause();
  }
  const rows = entries.filter(({ title }) => items.has(title)).map(({ word, title }) => [word, title, ...items.get(title)].join("\t"));
  const out = join(outDir, `lookup-${basename(file).replace(/\.[^.]*$/, "")}.tsv`);
  writeFileSync(out, ["word\ttitle\tqid\tsitelinks\ten\tnl", ...rows].join("\n") + "\n");
  const missing = entries.filter(({ title }) => !items.has(title)).map(({ title }) => title);
  console.log(`${rows.length} of ${entries.length} found, written to ${out}`);
  if (missing.length) console.log(`not found: ${missing.join(" | ")}`);
  process.exit(0);
}

for (const [name, options] of Object.entries(queries)) {
  if (only.length && !only.includes(name)) continue;
  const raw = [];
  const sitelinks = new Map();
  for (const type of options.classes) {
    const result = await run(`${name} ${type}`, popularQuery(type, options));
    raw.push(result);
    for (const binding of result.results.bindings) sitelinks.set(qid(binding), Number(field(binding, "sl")));
    await pause();
  }
  const popular = [...sitelinks].sort((a, b) => b[1] - a[1]).slice(0, options.limit);
  const details = new Map();
  for (let start = 0; start < popular.length; start += 200) {
    const items = popular.slice(start, start + 200).map(([id]) => `wd:${id}`);
    const result = await run(`${name} details`, detailsQuery(items, options.extra));
    raw.push(result);
    for (const binding of result.results.bindings) details.set(qid(binding), binding);
    await pause();
  }
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(raw));
  const rows = popular.map(([id, count]) => {
    const binding = details.get(id) ?? {};
    const columns = ["extra", "en", "nl", "enwiki", "nlwiki", "nlAliases"].map((key) => field(binding, key));
    return [id, count, ...columns].join("\t");
  });
  const header = "qid\tsitelinks\tyear_or_population\ten\tnl\tenwiki\tnlwiki\tnl_aliases";
  writeFileSync(join(outDir, `${name}.tsv`), [header, ...rows].join("\n") + "\n");
  console.log(`${name}: ${rows.length} candidates`);
}
