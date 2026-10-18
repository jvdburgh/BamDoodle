//! Whether the bamboozler's guess counts: forgiving about case, accents, spacing and one typo.

pub fn is_correct(guess: &str, word: &str) -> bool {
    let guess = normalise(guess);
    let word = normalise(word);
    if guess.is_empty() {
        return false;
    }
    guess == word || (word.chars().count() >= 5 && edit_distance(&guess, &word) <= 1)
}

fn normalise(text: &str) -> String {
    text.chars()
        .flat_map(char::to_lowercase)
        .map(fold_accent)
        .filter(|character| character.is_alphanumeric())
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
        assert!(is_correct("  Ice Cream ", "ice cream"));
        assert!(is_correct("icecream", "ice cream"));
        assert!(is_correct("creme brulee", "crème brûlée"));
    }

    #[test]
    fn one_typo_is_fine_for_longer_words() {
        assert!(!is_correct("giraf", "giraffe"));
        assert!(is_correct("girafe", "giraffe"));
        assert!(!is_correct("lighthuose", "lighthouse"));
        assert!(is_correct("lighthose", "lighthouse"));
    }

    #[test]
    fn short_words_must_be_exact() {
        assert!(!is_correct("bat", "cat"));
        assert!(is_correct("cat", "cat"));
    }

    #[test]
    fn empty_guess_is_wrong() {
        assert!(!is_correct("", "cat"));
        assert!(!is_correct("!!!", "cat"));
    }
}
