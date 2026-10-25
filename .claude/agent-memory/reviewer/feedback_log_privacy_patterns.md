---
name: log-privacy-patterns
description: usage/error logging and Cockpit queries under decision 0005
metadata: {type: feedback}
---
- Check each logged field against decision 0005 (no names, codes, words, IDs across visits); extension stack frames are IDs; room codes scrubbed in any case and host.
- LogQL `| json` over our lines makes `timestamp` a label: name the fields to extract.
