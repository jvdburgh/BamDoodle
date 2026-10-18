# Word lists

## What we need

- English and Dutch, simple, concrete, drawable words, grouped into categories (animals, food, objects, places,
  actions, …). Target about 800 to 1,200 base words per language, 10 to 14 categories of 50 to 100 words.
- An opt-in **adults pack** per language: about 150 to 300 suggestive but drawable words (think hangover,
  handcuffs, bikini). Rude is fine, hateful isn't: no slurs.
- Every word has one obvious drawable meaning.

## Where words come from

There is no clearly licensed, ready-made Pictionary-style list in either language (checked 2026-10-18), so we
curate our own. Automation proposes candidates, a human decides.

| Source | Licence | Use |
| --- | --- | --- |
| [Open English WordNet](https://github.com/globalwordnet/english-wordnet) | CC BY 4.0 + WordNet licence | English noun candidates, categories via hypernyms |
| [Open Dutch WordNet](https://github.com/cltl/OpenDutchWordnet) | CC BY-SA 4.0 | Dutch candidates, cross-check with English |
| [OpenTaal word list](https://github.com/OpenTaal/opentaal-wordlist) | BSD-3 or CC BY 3.0 | Dutch spelling check |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) | MIT | Keep common words (en, nl) |
| [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) | CC BY 4.0 | Blocklist and inspiration for the adults pack |

Avoid: Brysbaert concreteness norms (no open licence; fine to consult privately, don't commit), google-10000-english
(research-only), skribbl community lists (no licence).

## Format

One TOML file per language and pack, loaded by the server at startup:

```toml
# words/en/base.toml
language = "en"

[categories]
Animals = ["cat", "dog", "giraffe"]
"Around the house" = ["chair", "lamp"]
```

```
words/
  NOTICE          licence and credits for every source
  en/base.toml    starter pack, about 90 words in 8 categories
  en/adults.toml  adult = true, only used when the host switches the adults pack on
  nl/base.toml
  nl/adults.toml
```

Category names are what players see, in the pack's language. The current packs are small hand-written starters;
growing them to the target size is the next step for word lists.

Our curated lists are CC BY-SA 4.0 ([decision 0004](decisions/0004-licence.md)).
