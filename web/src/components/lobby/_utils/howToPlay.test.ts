import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HowToPlayUtils } from "@/components/lobby/_utils/howToPlay.utils";

describe("HowToPlayUtils", () => {
  it("asks the same questions as the FAQ for search engines in index.html", () => {
    const html = readFileSync(new URL("../../../../index.html", import.meta.url), "utf8");
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}";
    const faq = (JSON.parse(json) as { "@graph": { "@type": string; mainEntity?: unknown[] }[] })["@graph"].find(
      (item) => item["@type"] === "FAQPage",
    );
    expect(faq?.mainEntity).toEqual(
      HowToPlayUtils.questions.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    );
  });
});
