---
name: pull-request
description: Open or update a BamDoodle pull request - title format, body sections, evidence (what ran, screenshots or a recording for UI), and follow-ups. Use when opening a PR, editing its description, or when asked for evidence.
---

# Pull requests

- Open as a draft: `gh pr create --draft`, title like the commit convention, `type(scope): imperative summary`.
- The body follows `.github/PULL_REQUEST_TEMPLATE.md`: what the player gets in one or two sentences, a screenshot or
  short recording for anything visible (Firefox), what ran (`just check`, the browser you tried), what you didn't
  check, and Follow-ups.
- Keep the visible part short; fold detail into `<details><summary>Details</summary>` with blank lines around the
  content.
- Before pushing: run the `reviewer` agent and fix Blocking and Important findings.
- Pushing and merging are the maintainer's call: prepare, then ask.
