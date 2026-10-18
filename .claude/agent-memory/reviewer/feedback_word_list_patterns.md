---
name: word-list-patterns
description: Fair-play and quality checks for words/*.toml reviews (word equal to its category name, ride/brand names)
metadata:
  type: feedback
---

- The bamboozler sees the category (docs/game-rules.md), so a word equal to (or contained in) its category name
  hands them the word: e.g. "Sinterklaas" in category Sinterklaas (first seen 2026-10-18).
- Proper names in themed packs (Efteling rides like "Baron 1898", "Fata Morgana") often fail "drawable" or
  "one meaning" in .claude/skills/word-lists/SKILL.md.

**Why:** found by a tomllib script, not by eye.
**How to apply:** run a python3 -I tomllib script over words/<lang>/*.toml: duplicates per language, word==category,
sorted per category.
