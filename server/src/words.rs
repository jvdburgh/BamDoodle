//! Word packs from `words/<language>/<pack>.toml`, loaded once at startup. Players pick from categories; which file a
//! category lives in only matters for organising the lists.

use std::{
    collections::{BTreeMap, HashSet},
    fs,
    path::Path,
};

use anyhow::Context;
use rand::{Rng, seq::IndexedRandom};
use serde::Deserialize;

use crate::protocol::{Language, WordCategory};

#[derive(Debug, Clone, Deserialize)]
pub struct WordPack {
    pub language: Language,
    /// Every category in this pack is 18+.
    #[serde(default)]
    pub adult: bool,
    /// Category name as players see it, to the words in it.
    pub categories: BTreeMap<String, Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SecretWord {
    pub category: String,
    pub word: String,
}

#[derive(Debug, Clone)]
struct Category {
    language: Language,
    name: String,
    adult: bool,
    words: Vec<String>,
}

#[derive(Debug, Default)]
pub struct WordLibrary {
    categories: Vec<Category>,
    /// Mistakes in the lists that would spoil a game; `load` refuses to start with any.
    problems: Vec<String>,
}

impl WordLibrary {
    /// Categories with the same name in the same language are merged.
    pub fn new(packs: Vec<WordPack>) -> Self {
        let mut categories: Vec<Category> = Vec::new();
        let mut problems = Vec::new();
        for pack in packs {
            for (name, words) in pack.categories {
                match categories
                    .iter_mut()
                    .find(|category| category.language == pack.language && category.name == name)
                {
                    Some(category) => {
                        if category.adult != pack.adult {
                            problems.push(format!(
                                "{:?} category {name:?} is 18+ in one file and not in another",
                                pack.language
                            ));
                        }
                        category.adult |= pack.adult;
                        category.words.extend(words);
                    }
                    None => categories.push(Category {
                        language: pack.language,
                        name,
                        adult: pack.adult,
                        words,
                    }),
                }
            }
        }
        for category in &mut categories {
            let mut seen = HashSet::new();
            category.words.retain(|word| seen.insert(word.to_lowercase()));
        }
        for category in &categories {
            if category.words.is_empty() {
                problems.push(format!(
                    "{:?} category {:?} has no words",
                    category.language, category.name
                ));
            }
        }
        Self { categories, problems }
    }

    pub fn problems(&self) -> &[String] {
        &self.problems
    }

    pub fn load(dir: &Path) -> anyhow::Result<Self> {
        let mut packs = Vec::new();
        for language_dir in fs::read_dir(dir).with_context(|| format!("reading {}", dir.display()))? {
            let language_dir = language_dir?.path();
            if !language_dir.is_dir() {
                continue;
            }
            for file in fs::read_dir(&language_dir)? {
                let path = file?.path();
                if path.extension().is_some_and(|extension| extension == "toml") {
                    let text = fs::read_to_string(&path)?;
                    let pack: WordPack =
                        toml::from_str(&text).with_context(|| format!("parsing {}", path.display()))?;
                    packs.push(pack);
                }
            }
        }
        anyhow::ensure!(!packs.is_empty(), "no word packs found in {}", dir.display());
        let library = Self::new(packs);
        anyhow::ensure!(
            library.problems.is_empty(),
            "word lists in {}: {}",
            dir.display(),
            library.problems.join("; ")
        );
        Ok(library)
    }

    /// Everything a host can pick from, everyday categories first, then 18+, each by name.
    pub fn catalogue(&self) -> Vec<WordCategory> {
        let mut catalogue: Vec<WordCategory> = self
            .categories
            .iter()
            .map(|category| WordCategory {
                language: category.language,
                name: category.name.clone(),
                adult: category.adult,
                words: u32::try_from(category.words.len()).unwrap_or(u32::MAX),
            })
            .collect();
        catalogue.sort_by(|a, b| (a.language as u8, a.adult, &a.name).cmp(&(b.language as u8, b.adult, &b.name)));
        catalogue
    }

    /// The everyday (not 18+) categories of a language: what a room starts with.
    pub fn default_categories(&self, language: Language) -> Vec<String> {
        self.catalogue()
            .into_iter()
            .filter(|category| category.language == language && !category.adult)
            .map(|category| category.name)
            .collect()
    }

    /// At least one category, no duplicates, and every one of them exists in `language` (which also caps the size).
    pub fn has_categories(&self, language: Language, names: &[String]) -> bool {
        let unique: HashSet<&String> = names.iter().collect();
        !names.is_empty()
            && unique.len() == names.len()
            && names.iter().all(|name| {
                self.categories
                    .iter()
                    .any(|category| category.language == language && &category.name == name)
            })
    }

    /// Every word of one category, empty when it doesn't exist.
    pub fn words_in(&self, language: Language, name: &str) -> &[String] {
        self.categories
            .iter()
            .find(|category| category.language == language && category.name == name)
            .map_or(&[], |category| &category.words)
    }

    /// A random word from the picked categories. Prefers words not in `used`; when every word has been used, any
    /// word will do.
    pub fn pick(
        &self,
        language: Language,
        categories: &[String],
        used: &HashSet<String>,
        rng: &mut impl Rng,
    ) -> Option<SecretWord> {
        let candidates: Vec<SecretWord> = self
            .categories
            .iter()
            .filter(|category| category.language == language && categories.contains(&category.name))
            .flat_map(|category| {
                category.words.iter().map(|word| SecretWord {
                    category: category.name.clone(),
                    word: word.clone(),
                })
            })
            .collect();
        let fresh: Vec<&SecretWord> = candidates
            .iter()
            .filter(|secret| !used.contains(&secret.word))
            .collect();
        if fresh.is_empty() {
            candidates.choose(rng).cloned()
        } else {
            fresh.choose(rng).map(|secret| (*secret).clone())
        }
    }
}

#[cfg(test)]
mod tests {
    use rand::{SeedableRng, rngs::StdRng};

    use super::*;

    fn library() -> WordLibrary {
        WordLibrary::new(vec![
            WordPack {
                language: Language::En,
                adult: false,
                categories: BTreeMap::from([
                    ("Animals".into(), vec!["cat".into(), "dog".into()]),
                    ("Food".into(), vec!["pizza".into()]),
                ]),
            },
            WordPack {
                language: Language::En,
                adult: false,
                categories: BTreeMap::from([("Animals".into(), vec!["owl".into(), "Cat".into()])]),
            },
            WordPack {
                language: Language::En,
                adult: true,
                categories: BTreeMap::from([("After dark".into(), vec!["hangover".into()])]),
            },
        ])
    }

    fn names(names: &[&str]) -> Vec<String> {
        names.iter().map(|name| name.to_string()).collect()
    }

    #[test]
    fn words_only_come_from_the_picked_categories() {
        let mut rng = StdRng::seed_from_u64(1);
        for _ in 0..50 {
            let secret = library()
                .pick(Language::En, &names(&["Food"]), &HashSet::new(), &mut rng)
                .unwrap();
            assert_eq!(secret.word, "pizza");
        }
        assert!(library().pick(Language::En, &[], &HashSet::new(), &mut rng).is_none());
    }

    #[test]
    fn categories_with_the_same_name_are_merged_without_duplicates() {
        let catalogue = library().catalogue();
        let animals = catalogue.iter().find(|category| category.name == "Animals").unwrap();
        assert_eq!(animals.words, 3, "cat, dog, owl (Cat is a duplicate)");
    }

    #[test]
    fn the_catalogue_lists_everyday_categories_before_adult_ones() {
        let catalogue: Vec<(String, bool)> = library()
            .catalogue()
            .into_iter()
            .map(|category| (category.name, category.adult))
            .collect();
        assert_eq!(
            catalogue,
            vec![
                ("Animals".into(), false),
                ("Food".into(), false),
                ("After dark".into(), true)
            ]
        );
        assert_eq!(library().default_categories(Language::En), names(&["Animals", "Food"]));
    }

    #[test]
    fn a_mixed_adult_category_is_a_problem_but_a_word_may_name_its_category() {
        let broken = WordLibrary::new(vec![
            WordPack {
                language: Language::Nl,
                adult: false,
                categories: BTreeMap::from([
                    ("Sinterklaas".into(), vec!["sinterklaas".into(), "mijter".into()]),
                    ("Na middernacht".into(), vec!["kater".into()]),
                ]),
            },
            WordPack {
                language: Language::Nl,
                adult: true,
                categories: BTreeMap::from([("Na middernacht".into(), vec!["bierbuik".into()])]),
            },
        ]);
        assert_eq!(broken.problems().len(), 1, "{:?}", broken.problems());
        assert!(broken.problems()[0].contains("18+"));
        assert!(library().problems().is_empty());
    }

    #[test]
    fn picked_categories_must_exist_in_the_language() {
        assert!(library().has_categories(Language::En, &names(&["Animals", "After dark"])));
        assert!(!library().has_categories(Language::En, &names(&["Dieren"])));
        assert!(!library().has_categories(Language::Nl, &names(&["Animals"])));
        assert!(!library().has_categories(Language::En, &[]));
        assert!(!library().has_categories(Language::En, &names(&["Food", "Food"])));
    }

    #[test]
    fn prefers_unused_words_then_repeats() {
        let mut rng = StdRng::seed_from_u64(1);
        let used = HashSet::from(["pizza".to_string()]);
        assert!(
            library()
                .pick(Language::En, &names(&["Food"]), &used, &mut rng)
                .is_some()
        );
        let used = HashSet::from(["cat".to_string(), "dog".to_string()]);
        let secret = library()
            .pick(Language::En, &names(&["Animals"]), &used, &mut rng)
            .unwrap();
        assert_eq!(secret.word, "owl");
    }

    #[test]
    fn the_committed_word_packs_load() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../words");
        let library = WordLibrary::load(&dir).unwrap();
        for language in [Language::En, Language::Nl] {
            let defaults = library.default_categories(language);
            assert!(
                defaults.len() >= 12,
                "{language:?} starts with everyday and themed categories"
            );
            assert!(library.has_categories(language, &defaults));
        }
        assert!(library.catalogue().iter().any(|category| category.name == "Efteling"));
        assert!(library.catalogue().iter().any(|category| category.adult));
    }
}
