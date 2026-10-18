//! Word packs from `words/<language>/<pack>.toml`, loaded once at startup.

use std::{
    collections::{BTreeMap, HashSet},
    fs,
    path::Path,
};

use anyhow::Context;
use rand::{Rng, seq::IndexedRandom};
use serde::Deserialize;

use crate::protocol::Language;

#[derive(Debug, Clone, Deserialize)]
pub struct WordPack {
    pub language: Language,
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

#[derive(Debug, Default)]
pub struct WordLibrary {
    packs: Vec<WordPack>,
}

impl WordLibrary {
    pub fn new(packs: Vec<WordPack>) -> Self {
        Self { packs }
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
        Ok(Self { packs })
    }

    pub fn has_language(&self, language: Language) -> bool {
        self.packs.iter().any(|pack| pack.language == language && !pack.adult)
    }

    /// A random word for the language, from the base packs plus the adult packs when `adults` is on. Prefers words
    /// not in `used`; when every word has been used, any word will do.
    pub fn pick(
        &self,
        language: Language,
        adults: bool,
        used: &HashSet<String>,
        rng: &mut impl Rng,
    ) -> Option<SecretWord> {
        let candidates: Vec<SecretWord> = self
            .packs
            .iter()
            .filter(|pack| pack.language == language && (adults || !pack.adult))
            .flat_map(|pack| {
                pack.categories.iter().flat_map(|(category, words)| {
                    words.iter().map(|word| SecretWord {
                        category: category.clone(),
                        word: word.clone(),
                    })
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
                categories: BTreeMap::from([("Animals".into(), vec!["cat".into(), "dog".into()])]),
            },
            WordPack {
                language: Language::En,
                adult: true,
                categories: BTreeMap::from([("After dark".into(), vec!["hangover".into()])]),
            },
        ])
    }

    #[test]
    fn adult_words_only_when_switched_on() {
        let mut rng = StdRng::seed_from_u64(1);
        for _ in 0..50 {
            let secret = library().pick(Language::En, false, &HashSet::new(), &mut rng).unwrap();
            assert_eq!(secret.category, "Animals");
        }
    }

    #[test]
    fn prefers_unused_words_then_repeats() {
        let mut rng = StdRng::seed_from_u64(1);
        let used = HashSet::from(["cat".to_string()]);
        let secret = library().pick(Language::En, false, &used, &mut rng).unwrap();
        assert_eq!(secret.word, "dog");

        let used = HashSet::from(["cat".to_string(), "dog".to_string()]);
        assert!(library().pick(Language::En, false, &used, &mut rng).is_some());
    }

    #[test]
    fn no_words_for_a_missing_language() {
        let mut rng = StdRng::seed_from_u64(1);
        assert!(library().pick(Language::Nl, false, &HashSet::new(), &mut rng).is_none());
        assert!(!library().has_language(Language::Nl));
    }

    #[test]
    fn the_committed_word_packs_load() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../words");
        let library = WordLibrary::load(&dir).unwrap();
        assert!(library.has_language(Language::En));
        assert!(library.has_language(Language::Nl));
    }
}
