---
name: pull-request
description: Open or update a BamDoodle pull request - title format, body sections, evidence (what ran, a red-first test for a fix, screenshots or a recording for UI), review findings not addressed, and follow-ups. Use when opening a PR, editing its description, or when asked for evidence.
---

# Pull requests

- Open as a draft: `gh pr create --draft`, title like the commit convention, `type(scope): imperative summary`.
- The body follows `.github/PULL_REQUEST_TEMPLATE.md`. What shows without clicking: what the player gets in one or
  two sentences, then the screenshot or short recording for anything visible (Firefox), then the checklist. Every
  other section opens with one plain line and folds the rest into `<details><summary>Details</summary>`, with a
  blank line before and after the content so the markdown renders.
- Pushing and merging are the maintainer's call: prepare, then ask.

## Evidence

- Name the tests and the exact commands with their outcome (`just check`, `cargo test <name>`, the story file run
  with `pnpm exec vitest run --project=storybook <file>`). For a fix: "fails on main with `<assertion>`", then
  green with the change.
- What was seen in the running app and where (`just dev`, the browser, what you clicked); what was **not** checked
  and why.
- A visible change gets a screenshot; a flow gets a short recording or GIF. A story can be captured with
  `pnpm exec playwright screenshot -b firefox "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story" shot.png`
  in `web/` while Storybook runs; the maintainer drags it into the PR (the `gh` CLI can't upload images). Name files
  by what they show (`vote-after-reveal.png`).

## Review and follow-ups

- Before pushing: run the `reviewer` agent and fix Blocking and Important findings. Findings deliberately left out
  go under "Not addressed" with the reason.
- Follow-ups (a generic fix taken out of scope, an a11y gap in old UI, an idea for later) go under "Follow-ups" as
  one line each or as a GitHub issue, never as a TODO comment.
