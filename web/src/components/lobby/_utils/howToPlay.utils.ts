import type { BrandScribbleShape } from "@/components/brand/BrandScribble.component";

/** One card of the start page's "How to play": a doodle, a title and a line or a short list. */
type HowToPlayCard = { icon: BrandScribbleShape | "hat"; title: string; text: string; items?: string[] };

/**
 * The start page's "How to play", in words the rules in docs/game-rules.md agree with. The same words go to search
 * engines as FAQ structured data in index.html (`faq`); a test keeps the two the same.
 */
const steps: HowToPlayCard[] = [
  {
    icon: "pencil",
    title: "Draw the secret word together",
    text: "Everyone gets the same secret word and takes turns adding to one shared drawing, each on their own phone.",
  },
  {
    icon: "hat",
    title: "One of you is bluffing",
    text: "The bamboozler only sees the category. They draw along and try to blend in.",
  },
  {
    icon: "magnifier",
    title: "Vote who’s sketchy",
    text: "When the drawing is done, everyone votes. Then the bamboozler gets one guess at the word.",
  },
];

const points: HowToPlayCard = {
  icon: "star",
  title: "Points",
  items: [
    "+1 for every player who votes for the bamboozler",
    "+1 for the bamboozler when fewer than half of the others catch them",
    "+1 for the bamboozler who guesses the word",
  ],
  text: "Every round has a new word and a new bamboozler. Most points after the last round wins.",
};

const anyDevice: HowToPlayCard = {
  icon: "screen",
  title: "Free, on any device",
  text: "Play in the browser on a phone, tablet or laptop, with 3 to 8 players and English or Dutch words. No app, no accounts, no ads.",
};

/** The same answers as questions, for search engines. */
const faq = (): { question: string; answer: string }[] => [
  { question: "How do you play BamDoodle?", answer: steps.map((step) => `${step.title}: ${step.text}`).join(" ") },
  { question: "How do points work?", answer: `${(points.items ?? []).join(". ")}. ${points.text}` },
  { question: "What do I need to play?", answer: anyDevice.text },
];

export const HowToPlayUtils = { steps, more: [points, anyDevice], faq };
