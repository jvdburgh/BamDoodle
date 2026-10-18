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
  back the same seat (and score) after a refresh or a dropped connection, and with it their avatar. An avatar is a
  short list of strokes in the canvas's normalised point format, drawn in the lobby; the server keeps it with the
  seat and every player summary carries it, so joiners and reconnects see everyone's faces. Until a player sends one,
  every device shows the same doodle face seeded from the room code and player id.
- **Cleanup:** a player who is gone between rounds loses their seat after 2 minutes; a room with no players
  connected closes after 5 minutes (30 seconds if nobody ever joined it). Host screens don't keep a room open.
- **Words** come from `words/<language>/<pack>.toml`, loaded at startup (`WORDS_DIR`). Players pick categories, not
  files: the room snapshot lists every category (`wordCategories`), and `settings.categories` says which are in play.
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
- **Avatars:** any player sends `setAvatar { strokes }` between rounds, which replaces their whole avatar; everyone
  and the host screens get `avatarChanged { playerId, strokes }`. A stroke on the wire is `{ colour, pressure,
  points }`: avatars use one pen, so there is no size (`AvatarUtils.toWire` / `fromWire` map it to the canvas's
  stroke).
- **A game and its rounds:** the host can `updateSettings` between rounds (mode, turns per player, seconds per turn, rounds,
  words) and sends `startRound`; the first round of a game comes with `gameStarted` (scores from zero). Each device
  gets its own `roundStarted` (artists with the word, the bamboozler and host screens without). The active player
  sends `beginStroke`, `extendStroke` (batches of points) and `endStroke`; everyone gets `strokeBegun`,
  `strokeExtended`, `strokeEnded` and `turnStarted` (with which turn it is). While drawing, `suspect` is announced to everyone
  as `suspicionChanged`. After the last turn comes `votingStarted`: the final `castVote` is announced as `voteCast`
  with only the voter. When everyone has voted or the time is up (unsubmitted suspicions count), `revealed` names
  the bamboozler and every vote; their `guessWord` (or the guess timer) ends the round with `roundFinished`: the word,
  the guess, the awards, the scores and whether that was the last round (`gameOver`).
- Times are sent as milliseconds remaining, never as clock times, so device clocks don't matter.
- Per-device views: the server builds each view itself, so the bamboozler's device and host screens never receive
  the word before `roundFinished`, and nobody learns who the bamboozler is before `revealed`. Tests check the actual
  socket traffic for this.
- The client reconnects automatically with backoff, see [Talking to the server](#talking-to-the-server-websrcprotocol)
  (needed anyway; Scaleway Serverless Containers also cap a connection at the request timeout, max 60 minutes).

### Fair play, without over-engineering

- Secrets never leave the server early (above).
- Turns are enforced on the server: strokes from the wrong player, after the turn, off the canvas, with an odd
  colour or too many points are dropped. One-stroke turns allow one stroke, timed turns up to 40.
- Limits: 16 KiB per message, 128 points per message, 2,048 per stroke, 60,000 per round, 60 messages per second
  per connection, 10 seconds to say which room you want, 4 host screens per room, 500 rooms. A name is checked
  before a room is created. Not yet: a limit on rooms per IP address.
- A suspicion can change at most once a second (every change is announced to everyone). The final vote counts once
  per round, never for yourself, only from players in the round; a suspicion counts as your vote if you don't submit
  one.
- Only the host changes settings and starts rounds, only between rounds.
- An avatar changes only between rounds, at most once a second: up to 48 strokes and 700 points in total, at least
  one point per stroke, points on the square (rounded to 3 decimals) and colours from the avatar palette only. Any
  other `setAvatar` is dropped.
- What we don't try to stop: friends telling each other things on a voice call. That's part of a party game.

## Web (`web/`)

React + Vite + TypeScript, Tailwind 4, Storybook. React only renders the UI around the canvas; the drawing itself is
imperative canvas code, so the framework matters little for performance. No SSR (Next.js would add a Node server
and solve problems we don't have).

### Talking to the server (`web/src/protocol/`)

- `RoomConnection` (`roomConnection.ts`) is one device's connection. `start()` says hello (`createRoom`,
  `joinRoom` with the saved session token, or `watchRoom`), `send()` sends while joined, `close()` leaves for good.
- **Reconnects** use exponential backoff with jitter (0.5 s doubling to 10 s), and take the seat back with the
  session token (`sessionTokens.utils.ts`: `localStorage` per room code, offered only for the same name so a second
  tab under another name gets its own seat; without storage, the seat lasts as long as the page).
- **Your avatar:** `setAvatar()` sends it once the edits pause for a second, `flushAvatar()` right away (leaving
  the lobby), never twice within the server's one-second cooldown (the client waits 1.25 s). One set while
  (re)connecting goes out on joining, one set during a round after `roundFinished`.
- **Dead sockets:** a hello with no answer within 10 s, or a ping (every 15 s) with nothing coming back within 10 s,
  means the socket is dead, which sleeping phones produce. Times use `Date.now()`, which keeps counting while a
  phone sleeps.
- **A create is never retried once its hello went out:** that could make a second room. The client fails instead
  and the player taps again.
- **It stops for good** on `replaced` (another device took the seat), on a rejection that retrying can't fix
  (`roomNotFound`, `roomFull`, `nameTaken`, …) and on `close()`. The status says which: `connecting`, `joined`,
  `reconnecting`, `failed`, `replaced`, `closed`.
- **State** (`roomState.utils.ts`) is a pure reducer from server messages to a `RoomState`: the snapshot kept up to
  date, timers as deadlines on the device's clock, the last rejection and your own vote (the server only says *that*
  you voted). Immutable, so React can compare by reference.
- **React:** `useRoomConnection(intent)` opens a connection for a component's lifetime and returns it with its
  state; `useRoom(connection)` subscribes to one that exists elsewhere (`room.hook.ts`).
- Tests: unit tests with a fake socket and fake timers, plus `just test-live` (also in CI), which starts the Rust
  server and plays a round through the real client.

### Drawing pipeline

1. **Input:** Pointer Events on the canvas (`touch-action: none` on the canvas only), `setPointerCapture` on
   `pointerdown`, and `getCoalescedEvents()` on every move for smooth lines in Firefox and Chrome. A mouse reports
   pressure 0.5; treat that as "no pressure" and simulate it.
2. **Coordinates** are normalised (0 to 1 on a fixed aspect ratio), so every screen size and pixel density shows the
   same drawing.
3. **Sending:** the points of the stroke in progress are batched (around every 50 ms) and simplified before going over
   the wire, so others see it live. For now `CanvasUtils.simplify` drops points closer than a small distance to the
   previous one; [simplify-js](https://github.com/mourner/simplify-js) (BSD-2) is the next step if payloads need it.
4. **Rendering:** [perfect-freehand](https://github.com/steveruizok/perfect-freehand) (MIT, about 5 KB) turns points
   into nice variable-width outlines.
5. **Layers:** one offscreen canvas per player, composited onto the visible canvas. The mini-maps and the
   magnifying-glass spotlight draw from the same layers. Trade-off: strokes stack by player (turn order), not by when
   they were drawn, so a later stroke can end up under an earlier one from another player.
6. **High-DPI:** canvas buffer = CSS size × `devicePixelRatio`; resize when the ratio changes (zoom, monitor move).

No canvas framework (Konva, Fabric, Pixi): per-player layers are plain offscreen canvases, and those libraries add
weight without helping freehand strokes. tldraw is out: its licence isn't open source.

### Screens and routes

- `/` is the start page; `/join/BKZW` opens it on joining that room. A device holds one `RoomConnection`
  (`useRoomConnection`) and, once the room is there, renders `RoomPlayerView` from its `RoomState` and sends intents
  through `send` (`src/app/GameRoute.tsx`). The creator sets the room up first (`LobbySetup`, built from the
  snapshot's `settings` and `wordCategories`; every change is an `updateSettings`). A connection that gives up brings
  you back to the start page with the reason; every try gets a fresh connection.
- `/watch/BKZW` is a host screen: `watchRoom`, rendered by `RoomHostView` (`src/app/WatchRoute.tsx`).
- `components/room/` only renders server state. What the screens need beyond the raw state (who's up next, counts,
  this round's points from the awards, standings, the table talk from comparing suspicions and votes) is worked out in
  `RoomViewUtils`, `FeedUtils` and `useRoomView`, never the rules themselves.
- **Strokes:** the canvas draws your own stroke as you move, and `useStrokeSender` sends it: `beginStroke` with the
  first point, then the points batched about every 50 ms, thinned out and split at 128 per message, then `endStroke`.
  The server echoes your stroke back like everyone else's; `Drawing.sync` keeps the one you're drawing as drawn here
  until it ends, then the server's copy replaces it.
- Countdowns come from `state.timers`: a deadline on this device's clock and how long it ran, so bars need no copy of
  the server's timings.

### The lab (`/lab`)

The game on one device with simulated players, for working on the screens without a server: `useLabRoom`
(`components/lab/_hooks/labRoom.hook.ts`) plays the rounds with copies of the round flow and scoring
(`components/lab/_utils/`) and hands the same views the same `RoomState` the server would, for your phone and for a
host screen; your `send` is answered as the server would. The lab also has what isn't on the wire yet: drawing your
own avatar and own colours per player. A "Lab" panel (bottom right on a laptop, `?panel` on a phone) switches screen,
view (phone, host screen, both), role and player count; settings persist per viewer and in the URL. To try anything on
a phone on the same Wi-Fi: `pnpm --dir web dev --host`.

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
