# Claude Code setup for BamDoodle

Human-facing notes; Claude does not load this file.

| Piece | Loads | Notes |
| --- | --- | --- |
| `AGENTS.md` (shared, every agent) + `CLAUDE.md` (`@AGENTS.md` + Claude bits) | every session | the rules |
| `.claude/rules/*.md` with `paths:` | when a matching file is read or edited | server, protocol, web, canvas, stories |
| `.claude/skills/*/SKILL.md` | description always, body on use | protocol-change, word-lists, pull-request |
| `.claude/agents/reviewer.md` | on demand | fresh-context review before pushing |
| `.claude/hooks/format-lint.sh` | after every Edit/Write | rustfmt or oxfmt + oxlint on the edited file |
| `.claude/hooks/verify-stop.sh` | end of every turn that edited code | clippy, tsc, touched stories; max 2 blocks |
| `.claude/settings.local.json`, `.claude/worktrees/` | personal, gitignored | |

Set `CLAUDE_SKIP_VERIFY=1` to skip the stop check for a session. The setup is a living document: when Claude gets
corrected twice on the same point, fix the guidance here in the same PR.
