---
name: word-lists
description: Add, curate or review BamDoodle word lists (English and Dutch; everyday, themed and 18+ categories) - which sources are allowed, licences and credits, file format, and what makes a good drawable word. Use when touching words/ or when asked for new words, categories or languages.
---

# Word lists

Read [docs/words.md](../../../docs/words.md) first: it has the allowed sources and their licences.

## A good word

- Concrete and drawable in a few strokes by an average person: "lighthouse" yes, "freedom" no.
- One obvious meaning (no "bat" without a category that settles it).
- Common enough that most players know it, in the target language (not a translation nobody uses).
- 18+ categories: suggestive or rude is fine, hateful never. No slurs, nothing about protected groups, nothing sexual
  involving minors. When in doubt, leave it out.

## Rules

- Only the sources in `docs/words.md`. Never copy lists without a clear open licence (skribbl community lists, random
  gists, research-only datasets).
- Automation may propose candidates; a human reviews every word before it's committed. Say in the PR which source a
  batch came from.
- Credit sources in `words/NOTICE`. Our curated lists are CC BY-SA 4.0.
- Keep files sorted alphabetically per category; no duplicates across categories in the same pack.
- Dutch: check spelling against OpenTaal.
- A category that is 18+ in one file and everyday in another stops the server from loading the lists.
- Themed categories of real things (Efteling attractions, logos) list them all, by their real names, even when not
  every one is easy to draw; that's part of the fun for people who know them. A word may equal its category name.
