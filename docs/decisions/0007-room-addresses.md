# 0007: A room's address is its code; no lab

Status: accepted (2026-10-25)

## Context

Rooms were shared as `bamdoodle.io/join/BKZW`, and `/lab` played the whole game on one device with simulated players
and its own copies of the round flow and scoring, for working on the screens without a server. Players found the
`/join` prefix noise, and the lab's copies drifted from the server and needed upkeep of their own.

## Decision

- A room lives at `/BKZW` (four letters from the room-code alphabet `BDFGHJKMPRSTVWXZ`, any case; a C reads as G
  and an N as M). `/watch/BKZW` is a screen; the host
  screen lives there too, so a reload hosts again. `/join/BKZW` and `/lab` are plain unknown paths now: the start page.
  The room-code alphabet, length and path are in one place, `RoomCodeUtils` (`web/src/protocol/roomCode.utils.ts`).
- The lab is removed, with its bots and its lab-only "Own colours" option. Screens are worked on through Storybook
  stories with typed fixtures, and played end to end against a local server (`just dev`, `just test-live`).

## Consequences

- Shorter links and QR codes; room codes in error reports are scrubbed in any case and under any host.
- Old `/join/…` links from the beta open the start page instead of the room. Accepted: the beta was among friends.
- No second implementation of the game rules in the client to keep in step with the server.
