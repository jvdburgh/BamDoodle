import { wordCategoriesFixture as wordPacks } from "@/components/lab/_fixtures/words.fixture";
import { WordsUtils } from "@/components/lab/_utils/words.utils";
import type { WordCategory } from "@/protocol/generated/WordCategory";

/** Every category as the server's room snapshot lists them (`wordCategories`), from the lab's copy of words/. */
export const wordCategoriesFixture: WordCategory[] = WordsUtils.catalogue(wordPacks);
