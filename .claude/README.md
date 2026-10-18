# Claude Code setup for BamDoodle

Human-facing notes; Claude does not load this file. `AGENTS.md` is the tool-agnostic source of truth; everything
here and in `CLAUDE.md` is Claude-only mechanics on top of it.

| Piece | Loads | Notes |
| --- | --- | --- |
| `AGENTS.md` (shared, every agent) + `CLAUDE.md` (`@AGENTS.md` + Claude bits) | every session | the rules |
| `.claude/rules/*.md` with `paths:` | when a matching file is read or edited | server, protocol, web, canvas, stories |
| `.claude/skills/*/SKILL.md` | description always, body on use | protocol-change, word-lists, pull-request, storybook-stories |
| `.claude/agents/reviewer.md` | on demand | fresh-context review before pushing; keeps a project memory |
| `.claude/agents/reuse-finder.md` | on demand | read-only "does this already exist?" search before a new file |
| `.claude/hooks/guard-paths.sh` | before every Edit/Write | denies generated protocol types, lockfiles, `LICENSE`, `brand/logo.svg`, `.env*` |
| `.claude/hooks/reuse-check.sh` | before a Write that creates a component, hook, utils or Rust file | lists existing files with a matching name word |
| `.claude/hooks/format-lint.sh` | after every Edit/Write | rustfmt or oxfmt + oxlint on the edited file; warnings as context |
| `.claude/hooks/verify-stop.sh` | end of every turn that edited code or guidance | clippy, tsc, touched stories, `just check-agents`; max 2 blocks |
| `scripts/check-agents.mts` | `just check`, pre-push, CI | every path cited in the guidance exists |
| `.claude/settings.local.json`, `.claude/worktrees/` | personal, gitignored | |

Set `CLAUDE_SKIP_VERIFY=1` to skip the stop check for a session. Hooks are POSIX `sh` plus `node`; no `jq` or Python.
Test a hook by piping it the JSON Claude sends, for example
`echo '{"tool_input":{"file_path":"'$PWD'/LICENSE"},"session_id":"t"}' | CLAUDE_PROJECT_DIR=$PWD .claude/hooks/guard-paths.sh`.

## Keeping it healthy

- The setup is a living document: when Claude gets corrected twice on the same point, fix `AGENTS.md`, a rule or a
  skill in the same PR.
- A path cited on purpose before it exists (`words/`, `infra/`) goes in `plannedPaths` in
  `scripts/check-agents.mts`; remove it once the path lands.
- The reviewer's memory lives in the agent-memory folder under `.claude/` once it has written one; it's committed,
  so read it now and then and prune it to under 50 lines.
- Each rule must earn its place: when the model gets something right without a line, delete the line.
