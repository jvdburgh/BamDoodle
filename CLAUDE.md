@AGENTS.md

## Claude-specific

- "How we work" 1: plan mode for anything that adds a file or a dependency, changes the protocol or touches more
  than three files. 2: one `AskUserQuestion` round, each question with the snippet and your recommendation.
  10: narrate the next change in a few lines.
- 5: before creating a file under `web/src/components` or `server/src`, run the `reuse-finder` agent with the need
  in one sentence and act on its answer. The `reuse-check` hook also lists same-named files when you write a new
  component, hook, utils file or Rust module.
- 9: before pushing, run the `reviewer` agent (or `/code-review`) on the diff; fix Blocking and Important findings,
  list the rest under Follow-ups or "Not addressed".
- Hooks in `.claude/settings.json`: `guard-paths` refuses edits to generated protocol types, lockfiles, `LICENSE`,
  `brand/logo.svg` and `.env` files (the reason says what to do instead); `format-lint` formats and lints every
  edited file and hands back oxlint warnings; `verify-stop` blocks the end of a turn while clippy, typecheck, a
  touched story or `just check-agents` fails. Fix what they report; if a hook blocks twice on the same thing, stop
  and say so.
- Rules in `.claude/rules/` load by path. Skills: `protocol-change`, `word-lists`, `pull-request`,
  `storybook-stories`.
- Big batches (the maintainer may ask for "sub agents"): `Agent` with `isolation: "worktree"`, one per group of files,
  each with a self-contained brief (scope, files it owns, tests, "don't push or merge"). Merge with `git merge` into
  main, then run the `reviewer` on the combined diff and a walkthrough of every screen before pushing.
- Human notes on this setup: `.claude/README.md`.
