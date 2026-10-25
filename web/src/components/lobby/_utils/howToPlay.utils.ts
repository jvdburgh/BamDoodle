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
    title: "Draw together",
    text: "Everyone gets the same secret word and takes turns adding to one shared drawing.",
  },
  {
    icon: "hat",
    title: "One of you bluffs",
    text: "The bamboozler only knows the category, draws along and tries not to get caught.",
  },
  {
    icon: "magnifier",
    title: "Spot the bamboozler",
    text: "When the drawing is done, everyone votes for who they think didn’t know the word.",
  },
];

const points: HowToPlayCard = {
  icon: "check",
  title: "Score points",
  text: "+1 for catching the bamboozler. The bamboozler gets +1 if fewer than half catch them, and +1 for the word.",
};

const rounds: HowToPlayCard = {
  icon: "star",
  title: "Play a few rounds",
  text: "Every round has a new word and a new bamboozler. Most points after the last round wins.",
};

const anyDevice: HowToPlayCard = {
  icon: "screen",
  title: "Free, on any device",
  text: "3 to 8 players on phones, tablets or laptops, with a big screen to host if you like. No accounts.",
};

/** The same answers as questions, for search engines. */
const faq = (): { question: string; answer: string }[] => [
  { question: "How do you play BamDoodle?", answer: steps.map((step) => `${step.title}: ${step.text}`).join(" ") },
  { question: "How do you score points?", answer: points.text },
  { question: "Who wins?", answer: rounds.text },
  { question: "What do I need to play?", answer: anyDevice.text },
];

export const HowToPlayUtils = { steps, more: [points, rounds, anyDevice], faq };
