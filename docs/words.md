# Word lists

## What we need

- English and Dutch, simple, concrete, drawable words, grouped into categories (animals, food, objects, places,
  actions, …). Target about 800 to 1,200 base words per language, 10 to 14 categories of 50 to 100 words.
- **Themed categories** players pick before a round: Dutch and English culture (Efteling, Sinterklaas, Typisch
  Nederlands, Lekker Nederlands, Very British, Christmas, Fairy tales, Landmarks) and Logos (Dutch and
  international brands), more to come. Efteling has every attraction and figure.
- **18+ categories** per language: about 150 to 300 suggestive but drawable words (think hangover,
  handcuffs, bikini). Rude is fine, hateful isn't: no slurs.
- Every word has one obvious drawable meaning.
- **Every entry is a single word**, names included (hyphens and apostrophes are fine). Only the Efteling category keeps
  multi-word names. `python3 -I scripts/words/check.py` checks this, sorting and duplicates; with the downloaded
  OpenTaal, WordNet and frequency lists it also flags spelling and rare words.

## Where words come from

There is no clearly licensed, ready-made Pictionary-style list in either language (checked 2026-10-18), so we
curate our own. Automation proposes candidates, a human decides.

| Source | Licence | Use |
| --- | --- | --- |
| [Open English WordNet](https://github.com/globalwordnet/english-wordnet) | CC BY 4.0 + WordNet licence | English noun candidates, categories via hypernyms |
| [Open Dutch WordNet](https://github.com/cltl/OpenDutchWordnet) | CC BY-SA 4.0 | Dutch candidates, cross-check with English |
| [OpenTaal word list](https://github.com/OpenTaal/opentaal-wordlist) | BSD-3 or CC BY 3.0 | Dutch spelling check |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) | MIT | Keep common words (en, nl) |
| [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) | CC BY 4.0 | Blocklist and inspiration for the 18+ categories |

Avoid: Brysbaert concreteness norms (no open licence; fine to consult privately, don't commit), google-10000-english
(research-only), skribbl community lists (no licence).

## Format

One TOML file per language and pack, loaded by the server at startup. Players see and pick **categories**; a file
just groups categories for us. A category with the same name in two files of one language is merged.

```toml
# words/nl/nederland.toml
language = "nl"
# adult = true  marks every category in the file as 18+

[categories]
Efteling = ["Holle Bolle Gijs", "Langnek", "Droomvlucht"]
"Lekker Nederlands" = ["bitterbal", "stroopwafel"]
```

```
words/
  NOTICE            licence and credits for every source
  en/base.toml      everyday categories (single words)
  en/tech.toml      Tech
  en/media.toml     Films, TV shows, Cartoons and comics, Video games
  en/world.toml     Countries, Cities
  en/culture.toml   themed: Very British, Christmas, Fairy tales, Landmarks
  en/logos.toml     Logos: Dutch and international brands
  en/adults.toml    adult = true
  nl/base.toml      everyday categories (single words)
  nl/tech.toml      Technologie
  nl/media.toml     Films, Tv-series, Tekenfilms en strips, Games
  nl/world.toml     Landen, Steden
  nl/nederland.toml themed: Efteling (every attraction and figure), Sinterklaas, Typisch Nederlands, Lekker Nederlands
  nl/logos.toml     Logo's: Nederlandse en internationale merken
  nl/adults.toml
```

Category names are what players see, in the pack's language. The lists are small hand-written starters; growing them
is the next step for word lists.

Our curated lists are CC BY-SA 4.0 ([decision 0004](decisions/0004-licence.md)).
