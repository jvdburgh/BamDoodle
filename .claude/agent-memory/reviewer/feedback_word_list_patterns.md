---
name: word-list-patterns
description: words/*.toml checks and the maintainer's overrides
metadata: {type: feedback}
---
- Maintainer allows: a word equal to its category; every Efteling attraction; brand names in Logos; living, political, controversial Famous people (not abusers).
- Check: guess.rs containment against category rivals that contain the word and typo-rivals; duplicates and sorting per category; a `group` header per pack; one group per category across files; nothing hateful.
