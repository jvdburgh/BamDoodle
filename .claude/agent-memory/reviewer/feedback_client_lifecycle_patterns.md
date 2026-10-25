---
name: client-lifecycle-patterns
description: WebSocket client (web/src/protocol/) bug classes to check first
metadata: {type: feedback}
---
- Timers: hidden tabs wake once a minute (ping and check in one tick drops healthy sockets); performance.now() stops in sleep; every hello/connect needs its own timeout.
- Intents: send-and-forget lost while reconnecting or on a new seat (resend on `joined`); pending vs confirmed (pending wins, send twice before the echo in tests); a create retried after a drop makes a second room; a reload on `joined` drops the create/join and pre-room state.
- Views: `inRoom` alone keeps a stale room after failed/replaced; client copies of server rules must skip what the server skips; per-turn state keyed on turnCount repeats next round.
