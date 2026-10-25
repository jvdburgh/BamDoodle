import type { WordCategory } from "@/protocol/generated/WordCategory";

/**
 * Categories as the server's room snapshot lists them (`wordCategories`): a sample of words/, with word counts, in
 * the server's order (by group, everyday first and 18+ last, then by name).
 */
export const wordCategoriesFixture: WordCategory[] = [
  { language: "en", name: "Actions", group: "everyday", adult: false, words: 10 },
  { language: "en", name: "Animals", group: "everyday", adult: false, words: 12 },
  { language: "en", name: "Around the house", group: "everyday", adult: false, words: 12 },
  { language: "en", name: "Food", group: "everyday", adult: false, words: 12 },
  { language: "en", name: "Nature", group: "everyday", adult: false, words: 11 },
  { language: "en", name: "Places", group: "everyday", adult: false, words: 12 },
  { language: "en", name: "Christmas", group: "culture", adult: false, words: 15 },
  { language: "en", name: "Fairy tales", group: "culture", adult: false, words: 17 },
  { language: "en", name: "Landmarks", group: "culture", adult: false, words: 16 },
  { language: "en", name: "Very British", group: "culture", adult: false, words: 19 },
  { language: "en", name: "Cities", group: "world", adult: false, words: 40 },
  { language: "en", name: "Countries", group: "world", adult: false, words: 60 },
  { language: "en", name: "Films", group: "media", adult: false, words: 30 },
  { language: "en", name: "TV shows", group: "media", adult: false, words: 30 },
  { language: "en", name: "Logos", group: "logos", adult: false, words: 55 },
  { language: "en", name: "After dark", group: "adults", adult: true, words: 10 },
  { language: "en", name: "Bodily matters", group: "adults", adult: true, words: 10 },
  { language: "nl", name: "Dieren", group: "everyday", adult: false, words: 12 },
  { language: "nl", name: "Doen", group: "everyday", adult: false, words: 10 },
  { language: "nl", name: "Eten", group: "everyday", adult: false, words: 12 },
  { language: "nl", name: "In huis", group: "everyday", adult: false, words: 12 },
  { language: "nl", name: "Kleding", group: "everyday", adult: false, words: 10 },
  { language: "nl", name: "Natuur", group: "everyday", adult: false, words: 11 },
  { language: "nl", name: "Plekken", group: "everyday", adult: false, words: 12 },
  { language: "nl", name: "Vervoer", group: "everyday", adult: false, words: 10 },
  { language: "nl", name: "Efteling", group: "dutch", adult: false, words: 63 },
  { language: "nl", name: "Lekker Nederlands", group: "dutch", adult: false, words: 18 },
  { language: "nl", name: "Sinterklaas", group: "dutch", adult: false, words: 16 },
  { language: "nl", name: "Typisch Nederlands", group: "dutch", adult: false, words: 18 },
  { language: "nl", name: "Logo's", group: "logos", adult: false, words: 55 },
  { language: "nl", name: "Lichamelijk", group: "adults", adult: true, words: 10 },
  { language: "nl", name: "Na middernacht", group: "adults", adult: true, words: 10 },
];
