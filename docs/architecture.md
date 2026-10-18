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
- **The server is the referee.** Clients send intents ("I drew these points", "I vote for Sam"). The server
  decides what is allowed and tells everyone the result.

## Server (`server/`)

Rust, Axum, tokio. Chosen because it is fast, small to run, and already familiar from AmputatorBot
([decision 0001](decisions/0001-stack.md)).

### State in memory

All live state lives in the process ([decision 0002](decisions/0002-in-memory-state.md)):

- **Room registry:** a map from room code to a handle for that room. Room codes are short, easy to read aloud and
  unambiguous (no `0/O`, `1/I`), generated randomly and checked for collisions.
- **One task per room.** Each room is its own tokio task that owns its state (players, roles, word, canvas strokes,
  votes, scores, timers) and handles one message at a time from a channel. No locks around game state, and no way
  for two rooms to interfere.
- **Players** get a random session token on join, which the browser keeps in `localStorage`. On reconnect the token
  puts them back in their seat. Nickname and avatar are also kept client-side.
- **Cleanup:** a room with nobody connected is removed after a grace period (a few minutes, so a refresh or a flaky
  connection doesn't kill the game).

The catch: a deploy or crash ends all running games. At hobby scale that's acceptable; deploy when it's quiet.

### Protocol

- JSON over one WebSocket per player, messages tagged by `type` (`server/src/protocol.rs`).
- [ts-rs](https://github.com/Aleph-Alpha/ts-rs) generates the TypeScript types into `web/src/protocol/generated/`
  (`just protocol`). The generated files are committed, and CI fails if they are stale.
- Per-player messages: the server builds each player's view itself, so the bamboozler's client never receives
  the word, and nobody's client learns who the bamboozler is before the reveal.
- The client reconnects automatically with backoff. Needed anyway, and Scaleway Serverless Containers cap a
  connection at the request timeout (max 60 minutes).

### Fair play, without over-engineering

- Secrets never leave the server early (above).
- Turns are enforced on the server: wrong player, out of time or too many points → dropped.
- Limits on message size, points per stroke and messages per second per connection.
- Votes are accepted once per player per round.
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

Follows the curriculum-ui conventions:

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
