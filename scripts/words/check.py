"""Checks the word lists in words/: duplicates within a language, sorting, the single-word rule (all categories but
Efteling), Dutch spelling against OpenTaal, English against Open English WordNet, and how common each word is.

Run from the repo root with downloads kept outside the repo (see docs/words.md for the sources):
  python3 -I scripts/words/check.py [--opentaal wordlist.txt] [--oewn english-wordnet.xml.gz]
                                    [--freq-en en_50k.txt] [--freq-nl nl_50k.txt] [--rare]
Without the optional files only the structural checks run. Exits 1 when a structural check fails; spelling and
frequency findings are printed for a person to review.
"""

import argparse
import gzip
import re
import sys
import tomllib
from pathlib import Path

# Every entry is a single word (hyphens and apostrophes are fine), names included: the maintainer's rule, so words
# are easy to guess and type. Efteling is the one exception: its attractions and figures keep their real names.
MULTI_WORD_CATEGORIES = {"Efteling"}
# Files of everyday words (no names), checked against the spelling and frequency lists.
EVERYDAY_FILES = {"base.toml", "tech.toml"}
# Brand names are only there to draw the logo, so they may share a spelling with an everyday word (Apple, apple).
BRAND_FILES = {"logos.toml"}


def load_packs(root):
    packs = []
    for path in sorted(root.glob("*/*.toml")):
        with path.open("rb") as file:
            packs.append((path, tomllib.load(file)))
    return packs


def sort_key(word):
    return word.casefold()


def structural(packs):
    problems = []
    seen = {}
    for path, pack in packs:
        language = pack["language"]
        for category, words in pack["categories"].items():
            if words != sorted(words, key=sort_key):
                problems.append(f"{path}: {category} is not sorted case-insensitively")
            for word in words:
                if word != word.strip() or "  " in word or not word:
                    problems.append(f"{path}: {category}: odd whitespace in {word!r}")
                if category not in MULTI_WORD_CATEGORIES and " " in word:
                    problems.append(f"{path}: {category}: more than one word: {word!r}")
                key = (language, word.casefold(), path.name in BRAND_FILES)
                if key in seen:
                    problems.append(f"{language}: {word!r} in {seen[key]} and {path.name}:{category}")
                else:
                    seen[key] = f"{path.name}:{category}"
    return problems


def opentaal(path):
    return set(Path(path).read_text(encoding="utf-8").splitlines())


def oewn_lemmas(path):
    lemmas = set()
    pattern = re.compile(r'<Lemma writtenForm="([^"]+)"')
    with gzip.open(path, "rt", encoding="utf-8") as file:
        for line in file:
            for match in pattern.finditer(line):
                lemmas.add(match.group(1).casefold())
    return lemmas


def frequency(path):
    ranks = {}
    for rank, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        word = line.split(" ")[0]
        ranks.setdefault(word, rank)
    return ranks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--words", default="words")
    parser.add_argument("--opentaal")
    parser.add_argument("--oewn")
    parser.add_argument("--freq-en")
    parser.add_argument("--freq-nl")
    parser.add_argument("--rare", action="store_true", help="list words missing from the frequency lists")
    args = parser.parse_args()

    packs = load_packs(Path(args.words))
    problems = structural(packs)
    for problem in problems:
        print("PROBLEM", problem)

    nl_words = opentaal(args.opentaal) if args.opentaal else None
    en_words = oewn_lemmas(args.oewn) if args.oewn else None
    ranks = {
        "en": frequency(args.freq_en) if args.freq_en else None,
        "nl": frequency(args.freq_nl) if args.freq_nl else None,
    }
    for path, pack in packs:
        language = pack["language"]
        everyday = path.name in EVERYDAY_FILES
        for category, words in pack["categories"].items():
            for word in words:
                if language == "nl" and nl_words is not None:
                    tokens = [word] if everyday else word.split(" ")
                    for token in tokens:
                        if token not in nl_words and token.lower() not in nl_words:
                            print(f"SPELLING nl {path.name}:{category}: {token!r} not in OpenTaal")
                if language == "en" and en_words is not None and everyday:
                    if word.casefold() not in en_words and word.casefold().replace("-", " ") not in en_words:
                        print(f"SPELLING en {path.name}:{category}: {word!r} not in Open English WordNet")
                if args.rare and everyday and ranks[language] is not None:
                    if word.casefold() not in ranks[language]:
                        print(f"RARE {language} {category}: {word}")
        for category, words in pack["categories"].items():
            print(f"COUNT {language} {path.name}: {category} = {len(words)}")

    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
