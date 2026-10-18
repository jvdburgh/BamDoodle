# Architecture

How BamDoodle is put together and why. Living document: update it in the PR that changes the design. Bigger
choices get a short record in [decisions/](decisions/).

## Overview

```
 browser (web/)                               server/ (one Rust binary)
 ┌────────────────────────┐   WebSocket /ws   ┌──────────────────────────────────┐
 │ React UI (lobby, HUD)  │ ◀──────────────▶ │ Axum                             │
 │ canvas + per-player    │   JSON messages   │  ├─ /ws  → player connection     │
 │ layers, mini-maps      │                   │  ├─ /api/health                  │
 └────────────────────────┘                   │  └─ static files (web/dist)      │
                                              │ Room registry (in memory)        │
                                              │  └─ one task per room: rules,    │
                                              │     turns, timers, votes, score  │
                                              └──────────────────────────────────┘
```

- **One process, one container image.** The server serves the built web app and the WebSocket. No database, no
  cache, no queue.
- **Phone first, optional host screen:** every *player device* (phone first, also tablet or desktop) shows the whole
  game: canvas, players, timers, secret, vote. An optional *host screen* (TV, beamer, laptop) shows the canvas big
  with more detail and never the word. Both are routes in the same web app and speak the same protocol; the server
  sends each the view it's allowed to see. See
  [game-rules.md](game-rules.md#where-its-played).
- **The server is the referee.** Clients send intents ("I drew these points", "I vote for Sam"). The server
  decides what is allowed and tells everyone the result.

## Server (`server/`)

Rust, Axum, tokio. Chosen because it is fast, small to run, and already familiar from AmputatorBot
([decision 0001](decisions/0001-stack.md)).

### State in memory

All live state lives in the process ([decision 0002](decisions/0002-in-memory-state.md)):

- **Room registry** (`server/src/registry.rs`): room code to a handle for that room's task. Codes are four
  consonants without look-alikes (`BCDFGHJKLMNPQRSTVWXZ`, so `BKTZ`), random and checked for collisions; at most
  500 rooms.
- **One task per room** (`server/src/room/task.rs`) owns the room, its connections and its timers, and handles one
  command at a time from a channel: join, watch, a client message, a disconnect, or a deadline passing. No locks
  around game state, and rooms can't interfere with each other. A connection whose queue fills up is dropped.
- **The rules** (`server/src/room/mod.rs`) are a plain state machine, `Room`, without I/O: every method takes the
  current time and returns the messages to send and to whom (everyone, one player, host screens). That's what the
  unit tests drive, one or more per rule in [game-rules.md](game-rules.md).
- **Players** get a random session token when they join; the browser keeps it in `localStorage` and sends it to take
  back the same seat (and score) after a refresh or a dropped connection. Nickname and avatar are client-side.
- **Cleanup:** a player who is gone between rounds loses their seat after 2 minutes; a room with no players
  connected closes after 5 minutes (30 seconds if nobody ever joined it). Host screens don't keep a room open.
- **Words** come from `words/<language>/<pack>.toml`, loaded at startup (`WORDS_DIR`).
- **Limits** are all in `server/src/limits.rs`.

The catch: a deploy or crash ends all running games. At hobby scale that's acceptable; deploy when it's quiet.

### Protocol

- JSON over one WebSocket per device at `/ws`, messages tagged by `type`, fields in camelCase
  (`server/src/protocol.rs`).
- [ts-rs](https://github.com/Aleph-Alpha/ts-rs) generates the TypeScript types into `web/src/protocol/generated/`
  (`just protocol`). The generated files are committed, and CI fails if they are stale.
- **The first message picks the room:** `createRoom { name }` (you become host), `joinRoom { code, name,
  sessionToken? }` or `watchRoom { code }` for a host screen. The answer is `joined` with your player id, your
  session token and a snapshot of the room as you may see it, or `rejected` with a reason.
- **A round:** the host sends `startRound`; each device gets its own `roundStarted` (artists with the word, the
  bamboozler and host screens without). The active player sends `beginStroke`, `extendStroke` (batches of points)
  and `endStroke`; everyone gets `strokeBegun`, `strokeExtended`, `strokeEnded` and `turnStarted`. Votes
  (`castVote`) are announced as `voteCast` with only the voter. When everyone has voted or the time is up,
  `revealed` names the bamboozler and every vote; their `guessWord` (or the guess timer) ends the round with
  `roundFinished`: the word, the guess, the awards and the scores.
- Times are sent as milliseconds remaining, never as clock times, so device clocks don't matter.
- Per-device views: the server builds each view itself, so the bamboozler's device and host screens never receive
  the word before `roundFinished`, and nobody learns who the bamboozler is before `revealed`. Tests check the actual
  socket traffic for this.
- The client should reconnect automatically with backoff (needed anyway; Scaleway Serverless Containers also cap a
  connection at the request timeout, max 60 minutes).

### Fair play, without over-engineering

- Secrets never leave the server early (above).
- Turns are enforced on the server: strokes from the wrong player, after the turn, off the canvas, with an odd
  colour or too many points are dropped. Classic turns allow one stroke, timed turns up to 40.
- Limits: 16 KiB per message, 128 points per message, 2,048 per stroke, 60,000 per round, 60 messages per second
  per connection, 10 seconds to say which room you want, 4 host screens per room, 500 rooms. A name is checked
  before a room is created. Not yet: a limit on rooms per IP address.
- A vote counts once per round, never for yourself, only from players in the round.
- Only the host changes settings and starts rounds, only between rounds.
- What we don't try to stop: friends telling each other things on a voice call. That's part of a party game.

## Web (`web/`)

React + Vite + TypeScript, Tailwind 4, Storybook. React only renders the UI around the canvas; the drawing itself is
imperative canvas code, so the framework matters little for performance. No SSR (Next.js would add a Node server
and solve problems we don't have).

### Drawing pipeline

1. **Input:** Pointer Events on the canvas (`touch-action: none` on the canvas only), `setPointerCapture` on
   `pointerdown`, and `getCoalescedEvents()` on every move for smooth lines in Firefox and Chrome. A mouse reports
   pressure 0.5; treat that as "no pressure" and simulate it.
2. **Coordinates** are normalised (0 to 1 on a fixed aspect ratio), so every screen size and pixel density shows the
   same drawing.
3. **Sending:** the points of the stroke in progress are batched (around every 50 ms) and simplified
   ([simplify-js](https://github.com/mourner/simplify-js), BSD-2) before going over the wire, so others see it live.
4. **Rendering:** [perfect-freehand](https://github.com/steveruizok/perfect-freehand) (MIT, about 5 KB) turns points
   into nice variable-width outlines.
5. **Layers:** one offscreen canvas per player, composited onto the visible canvas. The mini-maps and the
   magnifying-glass spotlight draw from the same layers.
6. **High-DPI:** canvas buffer = CSS size × `devicePixelRatio`; resize when the ratio changes (zoom, monitor move).

No canvas framework (Konva, Fabric, Pixi): per-player layers are plain offscreen canvases, and those libraries add
weight without helping freehand strokes. tldraw is out: its licence isn't open source.

### Code layout

Conventions (see AGENTS.md):

- `src/app/`: the app shell and routes.
- `src/components/<domain>/`: one home per domain (`canvas`, `lobby`, `room`, `avatar`, `vote`, `brand`, …), with
  `_hooks/`, `_utils/`, `_types/` inside when needed. Files are `Name.component.tsx`, `name.stories.tsx`,
  `name.utils.ts`, `name.hook.ts`.
- `src/protocol/`: the WebSocket client; `generated/` is ts-rs output, never edited by hand.
- Imports use the `@/` alias.

## Deploy

- `Dockerfile` builds web and server into one `linux/amd64` image.
- Hosting: Scaleway Serverless Containers with `min_scale = 1`, `max_scale = 1` (in-memory rooms need exactly one
  instance), fallback a small Scaleway Instance ([decision 0003](decisions/0003-hosting.md)).
- Terraform in `infra/scaleway/` and a GitHub Actions release on tag, like AmputatorBot. Not set up yet.

## Not now (follow-ups)

- Analytics, if any: EU-hosted and cookie-free (Plausible or self-hosted Umami), or nothing.
- Error tracking: GlitchTip (open source) rather than Sentry.
- Big-screen (TV) mode, PWA install, a native Android app (the server doesn't care what the client is).
- A database, only when there's something worth keeping (stats, custom word packs).
