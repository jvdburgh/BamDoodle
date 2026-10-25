---
name: server-room-patterns
description: Bug classes seen in server/src/room (unbounded broadcast payloads, rate limits, state cached across settings changes) to check first in room/protocol reviews
metadata:
  type: feedback
---

LEAD WITH (seen 3x by 2026-10-18): client input that fans out to Everyone without its own bound. Also when a
once-only message becomes repeatable (castVote made changeable: every change rebroadcast voteCast).
- New client message broadcast (e.g. `suspect` -> `suspicionChanged`) with only the generic 60 msg/s limit;
  .claude/rules/protocol.md wants a per-message limit.
- A `Vec` added to a client-sent struct (e.g. `settings.categories`) validated for membership only: duplicates and
  length up to MAX_MESSAGE_BYTES are stored and rebroadcast as `settingsChanged` to every connection.

Also check:
- New connection kind/role (host screen, 2026-10-25): wired into Leave but not every removal path. task.rs
  deliver() drops a slow conn without the role's detach; a takeover that drops the old conn silently (no
  `Rejected{Replaced}` like replace_connection_of) makes two same-token tabs reconnect-steal forever; MAX_SCREENS
  counted before a reclaim.
- Count limits sized to fit MAX_MESSAGE_BYTES: compute worst case with `node -e JSON.stringify` (avatar was exactly 16384).
- Derived state frozen in `Phase::Finished(result)` (e.g. `game_over`) while `updateSettings` is allowed in Finished.
- Paths into a phase change that skip the follow-up check: e.g. `disconnect` -> `next_turn` -> voting.

**Why:** each confirmed with scratch Rust tests appended to server/src/room/tests.rs (back up first, restore after).
**How to apply:** grep each new ClientMessage / new client field for a dedicated limit (rate, count, dedupe).
