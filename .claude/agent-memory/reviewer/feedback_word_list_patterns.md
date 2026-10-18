---
name: word-list-patterns
description: Checks for words/*.toml reviews, and the maintainer's decisions that override generic word-list advice
metadata:
  type: feedback
---

- Maintainer decision (2026-10-18): a word may equal its category name (e.g. "Sinterklaas" in category Sinterklaas),
  even though the bamboozler sees the category. Don't flag it.
- Maintainer decision (2026-10-18): the Efteling category lists every attraction (rides like "Baron 1898",
  "Fata Morgana" included) plus figures; a Logos category lists brand names. Don't flag these as not drawable.
- Still check: duplicates per category, files sorted per category, an 18+ / everyday clash for one category name
  (the server refuses to load it), nothing hateful.

**Why:** the maintainer explicitly undid the "word equals category" check and the Efteling pruning.
**How to apply:** run a python3 -I tomllib script over words/<lang>/*.toml for duplicates and sorting; leave the
choices above alone.
