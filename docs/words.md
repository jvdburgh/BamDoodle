# Word lists

## What there is

About 2,300 English and 2,500 Dutch words in 37 categories per language. More good words are always welcome.

- **Everyday categories:** simple, concrete, drawable words (animals, food, objects, places, actions, …).
- **Themed categories** players pick before a round: Dutch and English culture (Efteling, Sinterklaas, Typisch
  Nederlands, Lekker Nederlands, Very British, Christmas, Fairy tales, Landmarks), Logos (Dutch and international
  brands), media (Films, TV shows, Cartoons and comics, Superheroes, Video games), trivia (Memes, Board games, Famous
  people), Tech, Countries and Cities. Efteling has every attraction and figure.
- **Famous people** may be living or controversial, and politicians of any side are fair game. Not
  mass murderers, and nobody known mainly for abuse.
- **18+ categories** per language: about 150 to 300 suggestive but drawable words (think hangover,
  handcuffs, bikini). Rude is fine, hateful isn't: no slurs.
- Every word has one obvious drawable meaning.
- **Every entry is a single word**, names included (hyphens and apostrophes are fine). Only the Efteling category keeps
  multi-word names. `python3 -I scripts/words/check.py` checks this, sorting and duplicates; with the downloaded
  OpenTaal, WordNet and frequency lists it also flags spelling and rare words.

## Where words come from

There is no clearly licensed, ready-made drawing-game word list in either language (checked 2026-10-18), so we
curate our own. Automation proposes candidates, a human decides.

| Source | Licence | Use |
| --- | --- | --- |
| [Open English WordNet](https://github.com/globalwordnet/english-wordnet) | CC BY 4.0 + WordNet licence | English noun candidates, categories via hypernyms |
| [Open Dutch WordNet](https://github.com/cltl/OpenDutchWordnet) | CC BY-SA 4.0 | Dutch candidates, cross-check with English |
| [OpenTaal word list](https://github.com/OpenTaal/opentaal-wordlist) | BSD-3 or CC BY 3.0 | Dutch spelling check |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) | MIT | Keep common words (en, nl) |
| [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) | CC BY 4.0 | Blocklist and inspiration for the 18+ categories |

Avoid: Brysbaert concreteness norms (no open licence; fine to consult privately, don't commit), google-10000-english
(research-only), community word lists from other drawing games (no licence).

## Format

One TOML file per language and pack, loaded by the server at startup. Players see and pick **categories**; the
setup lists them under their file's `group` (everyday, culture, dutch, world, media, trivia, tech, logos, adults,
named Everyday, Culture, Dutch, World, Film & TV, Trivia, Tech, Logos and 18+ in the app). A category with the same
name in two files of one language is merged, and must have the same group there.

```toml
# words/nl/nederland.toml
language = "nl"
group = "dutch"
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
  en/media.toml     Films, TV shows, Cartoons and comics, Superheroes, Video games
  en/trivia.toml    Memes, Board games, Famous people
  en/world.toml     Countries, Cities
  en/culture.toml   themed: Very British, Christmas, Fairy tales, Landmarks
  en/logos.toml     Logos: Dutch and international brands
  en/adults.toml    adult = true
  nl/base.toml      everyday categories (single words)
  nl/tech.toml      Technologie
  nl/media.toml     Films, Tv-series, Tekenfilms en strips, Superhelden, Games
  nl/trivia.toml    Memes, Bordspellen, Bekende mensen
  nl/world.toml     Landen, Steden
  nl/nederland.toml themed: Efteling (every attraction and figure), Sinterklaas, Typisch Nederlands, Lekker Nederlands
  nl/logos.toml     Logo's: Nederlandse en internationale merken
  nl/adults.toml
```

Category names are what players see, in the pack's language. To add words: pick the file and category, keep it
sorted, run `python3 -I scripts/words/check.py`, and say in the pull request where the words came from.

Our curated lists are CC BY-SA 4.0 ([decision 0004](decisions/0004-licence.md)).
