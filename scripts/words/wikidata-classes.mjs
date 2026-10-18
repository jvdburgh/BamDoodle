// Candidate everyday words from Wikidata (CC0) for a human to review: the subclasses or instances of one class, with
// English and Dutch labels, ranked by how many Wikipedias write about them (sitelinks). Nothing here is final and
// nothing here writes word files; every word still goes through a person before it lands in words/.
//
// Run from the repo root:
//   node scripts/words/wikidata-classes.mjs Q34379 [limit] [--instances] [--direct] > out.tsv
//     (default: all subclasses, P279+; --instances: instances of the class or its subclasses; --direct: one level)
// Output: tab-separated sitelinks, QID, English label, Dutch label. Keep the output outside the repo.

const [qid, limitArg = "300", ...flags] = process.argv.slice(2);
if (!/^Q\d+$/.test(qid ?? "")) {
  console.error("usage: wikidata-classes.mjs Q123 [limit] [--instances] [--direct]");
  process.exit(1);
}
const limit = Number.parseInt(limitArg, 10);
const instances = flags.includes("--instances");
const direct = flags.includes("--direct");
const path = instances ? (direct ? "wdt:P31" : "wdt:P31/wdt:P279*") : direct ? "wdt:P279" : "wdt:P279+";

const query = `
SELECT ?item ?links ?en ?nl WHERE {
  ?item ${path} wd:${qid} .
  ?item wikibase:sitelinks ?links .
  ?item rdfs:label ?en . FILTER(LANG(?en) = "en")
  ?item rdfs:label ?nl . FILTER(LANG(?nl) = "nl")
}
ORDER BY DESC(?links)
LIMIT ${limit}`;

const response = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
  headers: {
    Accept: "application/sparql-results+json",
    "User-Agent": "BamDoodle word lists (open-source party game; everyday categories curation)",
  },
});
if (!response.ok) {
  console.error(`Wikidata answered ${response.status}: ${(await response.text()).slice(0, 500)}`);
  process.exit(1);
}
const seen = new Set();
for (const row of (await response.json()).results.bindings) {
  const id = row.item.value.split("/").pop();
  if (seen.has(id)) continue;
  seen.add(id);
  console.log([row.links.value, id, row.en.value, row.nl.value].join("\t"));
}
