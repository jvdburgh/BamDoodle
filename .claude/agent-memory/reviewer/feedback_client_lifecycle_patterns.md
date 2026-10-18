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
- Views reading `confirmed ?? pending` (round.yourVote ?? pendingVote): a change lags one RTT and a tap back is swallowed; pending wins.
- Tests of 'latest wins' that wait for each echo pass on the old first-wins code too; send twice before the echo.
- Session token keyed per room only: a second tab with another name silently takes the first tab's seat (server ignores name when token matches).
- Send-and-forget (`send()` true => clear pending) for a message the server drops by phase or cooldown (setAvatar mid-round, client spacing == server cooldown, no jitter margin): lost silently.
- Create retried after a drop before `joined` makes a second room (seated, so EMPTY_ROOM_GRACE, not UNUSED_ROOM_GRACE).

**Why:** each was confirmed with a scratch Vitest against the real code, not guessed.
**How to apply:** write a throwaway test in web/src/protocol/ (results to scratchpad file; console output is swallowed by grep), run, delete.

Seen 2026-10-18 wiring views to the server (confirmed with a scratch Drawing test):
- Local-vs-echo stroke reconciliation (`Drawing.sync`) that only covers the stroke in progress: a late echo after local end, or a second stroke begun before the first's `strokeEnded`, briefly erases the stroke you just drew.
- Screens that gate on `state.room` alone (`inRoom`) keep showing a stale room after `failed`/`reconnecting`; check every route, not just the player one.
- Client derivations of server rules (`next` up) that skip what the server skips (disconnected players).

Seen 2026-10-18 (release reload): a reload/redirect fired on `joined` throws away the create/join just made; GameRoute
starts at LobbyStart (no auto-resume), so check what the user lands on and whether a seated room is orphaned.
Seen again 2026-10-18 (setup-before-create): the pre-hello version reload also drops any pre-room client state (room plan).
