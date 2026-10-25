import type { BrandScribbleShape } from "@/components/brand/BrandScribble.component";

/** One card of the start page's "How to play": a doodle, a title and a line or two. */
type HowToPlayCard = { icon: BrandScribbleShape | "hat"; title: string; text: string };

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
    text: "The bamboozler only sees the category and draws along. +1 if fewer than half of you catch them.",
  },
  {
    icon: "magnifier",
    title: "Vote who’s sketchy",
    text: "+1 for everyone who votes for the bamboozler. Caught or not, the bamboozler then guesses the word for +1.",
  },
];

const rounds: HowToPlayCard = {
  icon: "star",
  title: "Rounds and the winner",
  text: "Every round has a new secret word and a new bamboozler. Most points after the last round wins.",
};

const anyDevice: HowToPlayCard = {
  icon: "screen",
  title: "Free, on any device",
  text: "In the browser on a phone, tablet or laptop, for 3 to 8 players. No app, no accounts, no ads.",
};

/** The same answers as questions, for search engines. */
const faq = (): { question: string; answer: string }[] => [
  { question: "How do you play BamDoodle?", answer: steps.map((step) => `${step.title}: ${step.text}`).join(" ") },
  { question: "Who wins?", answer: rounds.text },
  { question: "What do I need to play?", answer: anyDevice.text },
];

export const HowToPlayUtils = { steps, more: [rounds, anyDevice], faq };
