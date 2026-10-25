import type { BrandScribbleShape } from "@/components/brand/BrandScribble.component";

/**
 * The start page's "How to play", in words the rules in docs/game-rules.md agree with. The questions are also in
 * index.html as FAQ structured data for search engines; a test keeps the two the same.
 */
const steps: { icon: BrandScribbleShape | "hat"; title: string; text: string }[] = [
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

const points = [
  "+1 for every player who votes for the bamboozler",
  "+1 for the bamboozler when fewer than half of the others catch them",
  "+1 for the bamboozler who guesses the word",
];

const questions: { question: string; answer: string }[] = [
  {
    question: "What do I need to play?",
    answer:
      "3 to 8 players, each with a phone. No app and no accounts: create a room and share its link or four-letter code. A TV or laptop can show the drawing big as a host screen.",
  },
  {
    question: "Is it free?",
    answer: "Yes, with no ads, no accounts and no cookies. BamDoodle is open source and hosted in the European Union.",
  },
  {
    question: "Which languages can I play in?",
    answer: "English and Dutch, with everyday categories and optional 18+ ones.",
  },
];

export const HowToPlayUtils = { steps, points, questions };
