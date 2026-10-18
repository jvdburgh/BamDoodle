---
name: server-room-patterns
description: Bug classes seen in server/src/room (rate limits on new broadcasts, state cached across settings changes) to check first in room/protocol reviews
metadata:
  type: feedback
---

First seen 2026-10-18 (round-flow rework: laps, suspicions, final vote, games). Promote to "lead with" if seen again:

- New client message that fans out to Everyone (e.g. `suspect` -> `suspicionChanged`) with only the generic 60 msg/s per-connection limit; .claude/rules/protocol.md wants a per-message rate limit.
- Derived state frozen in `Phase::Finished(result)` (e.g. `game_over`) while `updateSettings` is allowed in Finished: a later settings change makes it stale ("round 3 of 1").
- Paths into a phase change that skip the follow-up check: e.g. `disconnect` -> `next_turn` -> voting; check each entry point has a test.

**Why:** both first two confirmed with scratch Rust tests appended to server/src/room/tests.rs (back up first, restore after).
**How to apply:** in server reviews, grep each new ClientMessage for a dedicated limit and each cached Finished field against update_settings.
