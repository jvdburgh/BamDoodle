---
name: client-lifecycle-patterns
description: Recurring bug classes in the web WebSocket client (web/src/protocol/) to check first in any review touching connection, timers or reducer
metadata:
  type: feedback
---

Lead with these when reviewing `web/src/protocol/` (first seen 2026-10-18, typed client review):

- Heartbeat that pings and checks silence in the same setInterval tick: Chrome/Edge throttle hidden tabs to 1 wake-up/min, so it drops healthy sockets; server then moves the host (ensure_host).
- `performance.now()` stops during sleep on macOS/Linux/Android/iOS (MDN): bad clock for sleep watchdogs and on-device deadlines.
- Watchdog/timeouts started only after `joined`: a hello or CONNECTING socket that hangs has no timeout.
- Optimistic client state (pendingVote) overwritten by a second send or never cleared on `rejected`: desync with server's first-wins rule.
- Session token keyed per room only: a second tab with another name silently takes the first tab's seat (server ignores name when token matches).
- Send-and-forget (`send()` true => clear pending) for a message the server drops by phase or cooldown (setAvatar mid-round, client spacing == server cooldown, no jitter margin): lost silently.
- Create retried after a drop before `joined` makes a second room (seated, so EMPTY_ROOM_GRACE, not UNUSED_ROOM_GRACE).

**Why:** each was confirmed with a scratch Vitest against the real code, not guessed.
**How to apply:** write a throwaway test in web/src/protocol/ (results to scratchpad file; console output is swallowed by grep), run, delete.
