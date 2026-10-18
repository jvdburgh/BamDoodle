//! Whether the bamboozler's guess counts: forgiving about case, accents, spacing and one typo, and the word may sit
//! inside a longer guess ("Donald Trump" for "Trump") as long as the rest doesn't name another word of the category.

pub fn is_correct(guess: &str, word: &str, category: &[String]) -> bool {
    let tokens = tokens(guess);
    let word = normalise(word);
    let rivals: Vec<String> = category
        .iter()
        .map(|other| normalise(other))
        .filter(|other| *other != word)
        .collect();
    runs(tokens.len()).any(|(start, end)| {
        let run = tokens[start..end].concat();
        let exact = run == word;
        (exact || (one_typo(&run, &word) && !rivals.contains(&run)))
            && !runs(tokens.len())
                .filter(|&(other_start, other_end)| other_start < start || other_end > end)
                .any(|(other_start, other_end)| {
                    let other = tokens[other_start..other_end].concat();
                    // A rival counts as strictly as the word did, so a typo'd list never beats the word alone.
                    rivals
                        .iter()
                        .any(|rival| other == *rival || (!exact && one_typo(&other, rival)))
                })
    })
}

fn one_typo(text: &str, word: &str) -> bool {
    word.chars().count() >= 5 && edit_distance(text, word) <= 1
}

/// Every run of consecutive tokens, as `start..end`.
fn runs(len: usize) -> impl Iterator<Item = (usize, usize)> {
    (0..len).flat_map(move |start| (start + 1..=len).map(move |end| (start, end)))
}

fn normalise(word: &str) -> String {
    tokens(word).concat()
}

fn tokens(text: &str) -> Vec<String> {
    text.chars()
        .flat_map(char::to_lowercase)
        .map(fold_accent)
        .collect::<String>()
        .split(|character: char| !character.is_alphanumeric())
        .filter(|token| !token.is_empty())
        .map(str::to_owned)
        .collect()
}

fn fold_accent(character: char) -> char {
    match character {
        'à' | 'á' | 'â' | 'ä' | 'ã' | 'å' => 'a',
        'è' | 'é' | 'ê' | 'ë' => 'e',
        'ì' | 'í' | 'î' | 'ï' => 'i',
        'ò' | 'ó' | 'ô' | 'ö' | 'õ' => 'o',
        'ù' | 'ú' | 'û' | 'ü' => 'u',
        'ç' => 'c',
        'ñ' => 'n',
        other => other,
    }
}

fn edit_distance(a: &str, b: &str) -> usize {
    let b: Vec<char> = b.chars().collect();
    let mut previous: Vec<usize> = (0..=b.len()).collect();
    for (i, a_char) in a.chars().enumerate() {
        let mut current = vec![i + 1; b.len() + 1];
        for (j, b_char) in b.iter().enumerate() {
            let substitution = previous[j] + usize::from(a_char != *b_char);
            current[j + 1] = substitution.min(previous[j + 1] + 1).min(current[j] + 1);
        }
        previous = current;
    }
    previous[b.len()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_match_ignores_case_spacing_and_accents() {
        assert!(is_correct("  Ice Cream ", "ice cream", &[]));
        assert!(is_correct("icecream", "ice cream", &[]));
        assert!(is_correct("creme brulee", "crème brûlée", &[]));
    }

    #[test]
    fn one_typo_is_fine_for_longer_words() {
        assert!(!is_correct("giraf", "giraffe", &[]));
        assert!(is_correct("girafe", "giraffe", &[]));
        assert!(!is_correct("lighthuose", "lighthouse", &[]));
        assert!(is_correct("lighthose", "lighthouse", &[]));
    }

    #[test]
    fn short_words_must_be_exact() {
        assert!(!is_correct("bat", "cat", &[]));
        assert!(is_correct("cat", "cat", &[]));
    }

    #[test]
    fn empty_guess_is_wrong() {
        assert!(!is_correct("", "cat", &[]));
        assert!(!is_correct("!!!", "cat", &[]));
    }

    fn category(words: &[&str]) -> Vec<String> {
        words.iter().map(|word| word.to_string()).collect()
    }

    #[test]
    fn a_longer_guess_counts_when_it_contains_the_word() {
        let people = category(&["Einstein", "Obama", "Trump"]);
        assert!(is_correct("Donald Trump", "Trump", &people));
        assert!(is_correct("president donald trump", "Trump", &people));
        assert!(is_correct("Albert Einsten", "Einstein", &people));
        assert!(is_correct(
            "ice bucket challenge",
            "ice-bucket",
            &category(&["ice-bucket", "Nyan"])
        ));
        assert!(is_correct("The Matrix", "Matrix", &category(&["Matrix"])));
    }

    #[test]
    fn the_word_must_be_whole_words_of_the_guess() {
        let animals = category(&["cat", "dog"]);
        assert!(!is_correct("catwalk", "cat", &animals));
        assert!(!is_correct("dogcat", "cat", &animals));
        assert!(!is_correct("bobcats", "cat", &animals));
    }

    #[test]
    fn a_guess_that_also_names_another_word_of_the_category_is_wrong() {
        let people = category(&["Einstein", "Obama", "Trump"]);
        assert!(!is_correct("trump obama", "Trump", &people));
        assert!(!is_correct("obama or trump", "Trump", &people));
        assert!(!is_correct("dog cat", "cat", &category(&["cat", "dog"])));
        assert!(is_correct("black cat", "cat", &category(&["cat", "dog"])));
    }

    #[test]
    fn a_word_made_of_other_category_words_still_counts() {
        let food = category(&["cream", "ice", "ice cream"]);
        assert!(is_correct("ice cream", "ice cream", &food));
        assert!(is_correct("a big ice cream", "ice cream", &food));
        assert!(!is_correct("ice cream", "cream", &food));
    }

    #[test]
    fn a_longer_word_of_the_category_is_not_the_word_inside_it() {
        assert!(!is_correct("ice cream", "cream", &category(&["cream", "ice cream"])));
        assert!(!is_correct(
            "Wit-Rusland",
            "Rusland",
            &category(&["Rusland", "Wit-Rusland"])
        ));
        assert!(!is_correct("T-shirt", "shirt", &category(&["shirt", "T-shirt"])));
    }

    #[test]
    fn rivals_count_as_strictly_as_the_word() {
        let people = category(&["Einstein", "Obama", "Trump"]);
        assert!(is_correct("house cat", "cat", &category(&["cat", "horse", "mouse"])));
        assert!(!is_correct("trumpp obbama", "Trump", &people));
        assert!(!is_correct("trumpp obama", "Trump", &people));
        assert!(is_correct("trump obamma", "Trump", &people));
    }

    #[test]
    fn the_word_listed_twice_is_not_its_own_rival() {
        assert!(is_correct("Trump", "Trump", &category(&["Trump", "trump"])));
    }
}
