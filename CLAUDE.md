@AGENTS.md

## Claude-specific

- Plan mode for anything that adds a dependency, changes the protocol or touches more than three files; show the
  plan with your recommendation before editing.
- Before pushing, run the `reviewer` agent on the diff; fix Blocking and Important findings, list the rest as
  follow-ups.
- Hooks in `.claude/settings.json` format and lint every edited file, and block the end of a turn while typecheck,
  clippy or a touched story fails. Fix what they report; if a hook blocks twice on the same thing, stop and say so.
- Rules in `.claude/rules/` load by path. Skills: `protocol-change`, `word-lists`, `pull-request`.
- Human notes on this setup: `.claude/README.md`.
