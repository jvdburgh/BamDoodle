# Architecture

How BamDoodle is put together and why. Living document: update it in the PR that changes the design. Bigger
choices get a short record in [decisions/](decisions/).

## Overview

```
 browser (web/)                               server/ (one Rust binary)
 ┌────────────────────────┐   WebSocket /ws   ┌──────────────────────────────────┐
 │ React UI (lobby, HUD)  │ ◀──────────────▶ │ Axum                             │
 │ canvas + per-player    │   JSON messages   │  ├─ /ws  → player connection     │
 │ layers, mini-maps      │                   │  ├─ /api/health, /api/version    │
 │                        │                   │  ├─ /api/room-defaults           │
 │                        │                   │  ├─ /api/client-error            │
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
  connected closes after 5 minutes (30 seconds if nobody ever joined it), and any room closes after 30 minutes without
  play (`roomClosed`). Watching screens and pings don't keep a room open; the host screen does.
- **Words** come from `words/<language>/<pack>.toml`, loaded at startup (`WORDS_DIR`). Players pick categories, not
  files: the room snapshot lists every category (`wordCategories`, each with the `group` its file names, which the
setup lists them under), and `settings.categories` says which are in play.
- **Limits** are all in `server/src/limits.rs`.

The catch: a deploy or crash ends all running games. At hobby scale that's acceptable; deploy when it's quiet.

### Protocol

- JSON over one WebSocket per device at `/ws`, messages tagged by `type`, fields in camelCase
  (`server/src/protocol.rs`).
- [ts-rs](https://github.com/Aleph-Alpha/ts-rs) generates the TypeScript types into `web/src/protocol/generated/`
  (`just protocol`). The generated files are committed, and CI fails if they are stale.
- **The first message picks the room:** `createRoom { name, settings? }` (you become host; the settings are checked
  like any `updateSettings`), `joinRoom { code, name, sessionToken? }`, `hostRoom { name, settings? }` for a screen that
  creates the room and hosts it without playing, or `watchRoom { code, sessionToken? }` for a screen (with the token
  `hostRoom` got, the host screen takes its role back after a reload). The answer is `joined` with your player id
  (none for a screen), your session token (a screen's only when it hosts) and a snapshot of the room as you may see
  it, or `rejected` with a reason. `RoomSnapshot.hostScreen` names who hosts on a screen: no player does while it's connected
  (`hostId` is null), its `updateSettings` and `startRound` count like a host player's, anything else it sends is
  dropped, and after `HOST_GRACE` away the first player becomes host (`hostChanged`).
- **Avatars:** any player sends `setAvatar { strokes }` at any time (also during a round: a face finished just as the
  host starts must still arrive), at most once a second, which replaces their whole avatar. A player done with their
  face (or joining mid-round) sends `ready`, again after every reconnect so a new seat hears it too; everyone gets `playerReady { playerId }` and `PlayerSummary.ready`
  says it in snapshots, so the host sees who's still drawing. Everyone and the host screens get
  `avatarChanged { playerId, strokes }`. A stroke on the wire is `{ colour, pressure,
  points }`: avatars use one pen, so there is no size (`AvatarUtils.toWire` / `fromWire` map it to the canvas's
  stroke).
- **A game and its rounds:** the host can `updateSettings` between rounds (mode, turns per player, seconds per turn, rounds,
  words) and sends `startRound`; the first round of a game comes with `gameStarted` (scores from zero). Each device
  gets its own `roundStarted` (artists with the word, the bamboozler and host screens without). The active player
  sends `beginStroke`, `extendStroke` (batches of points) and `endStroke`; everyone gets `strokeBegun`,
  `strokeExtended`, `strokeEnded` and `turnStarted` (with which turn it is). While drawing, `suspect` is announced to everyone
  as `suspicionChanged`. After the last turn comes `votingStarted`: a first `castVote` is announced as `voteCast`
  with only the voter; another `castVote` changes the vote and is confirmed to the voter alone. When everyone has voted or the time is up (unsubmitted suspicions count), `revealed` names
  the bamboozler and every vote; their `guessWord` (or the guess timer) ends the round with `roundFinished`: the word,
  the guess, the awards, the scores and whether that was the last round (`gameOver`). A snapshot during the results also
  carries the finished drawing (`phase.strokes`) for a device that joins or reconnects then.
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
- Only the host (a player, or the host screen) changes settings and starts rounds, only between rounds.
- `ready` is announced once per seat; a repeat is ignored.
- An avatar changes at any time, at most once a second: up to 48 strokes and 700 points in total, at least
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
  (`roomNotFound`, `roomFull`, `nameTaken`, …), on `roomClosed` (a room closed for inactivity, also after
  joining) and on `close()`. The status says which: `connecting`, `joined`,
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

- `/` is the start page; `/BKZW` opens it on joining that room (`RouteUtils.route`). A device holds one `RoomConnection`
  (`useRoomConnection`) and, once the room is there, renders `RoomPlayerView` from its `RoomState` and sends intents
  through `send` (`src/app/GameRoute.tsx`). Creating a room starts with `LobbySetup` before the room exists, from
  `GET /api/room-defaults` (the default settings and every category, `RoomDefaultsUtils`), then your name, then
  `createRoom` with those settings. Between rounds the host reopens the setup from the snapshot's `settings` and
  `wordCategories`; every change there is an `updateSettings`. A connection that gives up brings you back to the start
  page with the reason; every try gets a fresh connection.
- `/watch/BKZW` is a screen: `watchRoom`, rendered by `RoomHostView` (`src/app/WatchRoute.tsx`). The screen that
  created the room (`hostRoom` from the start page's "Host on this screen") lives at the same address, so a reload
  hosts again; `RoomState.hosting` says so, and `HostRoom` adds Start round and the room settings.
- `components/room/` only renders server state. What the screens need beyond the raw state (who's up next, counts,
  this round's points from the awards, standings, the table talk from comparing suspicions and votes) is worked out in
  `RoomViewUtils`, `FeedUtils` and `useRoomView`, never the rules themselves.
- **Strokes:** the canvas draws your own stroke as you move, and `useStrokeSender` sends it: `beginStroke` with the
  first point, then the points batched about every 50 ms, thinned out and split at 128 per message, then `endStroke`.
  The server echoes your stroke back like everyone else's; `Drawing.sync` keeps the one you're drawing as drawn here
  until it ends, then the server's copy replaces it.
- Countdowns come from `state.timers`: a deadline on this device's clock and how long it ran, so bars need no copy of
  the server's timings.

To try anything on a phone on the same Wi-Fi: `pnpm --dir web dev --host`.

### Code layout

Conventions (see AGENTS.md):

- `src/app/`: the app shell and routes.
- `src/components/<domain>/`: one home per domain (`canvas`, `lobby`, `room`, `avatar`, `vote`, `brand`, …), with
  `_hooks/`, `_utils/`, `_types/` inside when needed. Files are `Name.component.tsx`, `name.stories.tsx`,
  `name.utils.ts`, `name.hook.ts`.
- `src/protocol/`: the WebSocket client; `generated/` is ts-rs output, never edited by hand.
- Imports use the `@/` alias.

## Deploy

- `Dockerfile` builds web and server into one `linux/amd64` image with the word lists inside. CI builds it on every
  change and plays a short game against it (`image` job).
- Hosting: one Scaleway Serverless Container in Amsterdam, `min_scale = max_scale = 1`, request timeout 60 minutes for
  WebSockets ([decision 0003](decisions/0003-hosting.md)). Terraform in `infra/scaleway/`.
- Releases: a `v*` tag runs `.github/workflows/release.yml`: build, push, redeploy, then a health check and a short game
  over a real WebSocket. The runbook, with every command, is [infra/README.md](../infra/README.md).
- `scripts/ws-soak.mjs` (`just soak`) is the smoke and soak test for any running server.
- Versions: the release tag (e.g. `v0.1.1`) is baked into both the server binary and the web build
  (`BAMDOODLE_VERSION`, `/api/version`). Before it says hello, the web app asks `/api/version`; built for another release,
  it reloads itself once (a guard per version stops loops), so it never creates or joins with old code. After a
  deploy, an open tab's reconnect does the same. New releases always reach browsers: build files
  have hashed names and everything else is revalidated. The start page footer shows the version; a development build shows its commit instead (`VITE_BAMDOODLE_COMMIT`, from `git describe` in `web/vite.config.ts`).
- HTTP: every response carries HSTS, a Content Security Policy (scripts, sockets, fonts, images and sounds from our
  own origin only; inline styles allowed for React's `style`), `X-Frame-Options: DENY`, `nosniff` and a referrer and
  permissions policy (`server/src/lib.rs`). Hashed build files in `/assets/` are cached for a year, everything else is
  revalidated. Only the web app's own routes get `index.html`; anything that looks like a file, and unknown `/api/`
  or `/assets/` paths, is a 404.

## Usage and errors

[Decision 0005](decisions/0005-usage-and-errors.md): anonymous counts and error reports in our own logs, read in
Scaleway Cockpit. No cookies, no third-party script, nothing that points at a person.

- **Logs:** in the image (`LOG_FORMAT=json`) the server writes one JSON object per line; Scaleway wraps each in
  `{"resource_instance", "message"}`, so a Cockpit (Loki) query unwraps twice, extracting only the fields it needs:
  `{resource_type="serverless_container"} | json message="message" | line_format "{{.message}}" | json event="event"`.
  At most 60 lines a minute (`LOG_LINES_PER_MINUTE`, `server/src/logging.rs`): the one cost that grows with use is
  log storage, so whatever anyone sends, it stays capped.
- **Usage events** (`server/src/usage.rs`, `target="bamdoodle::usage"`): `room_created` (rooms open), `round_finished`
  (round of rounds, game over, players, how many caught the bamboozler, guessed, mode, turns, seconds, language, the
  categories in play and how many, whether any is 18+, and the category the word came from, never the word) and
  `room_closed` (unused, empty or idle, and minutes open).
- **Server errors:** anything at `ERROR`, including panics (`bamdoodle::panic`, from a panic hook in `main.rs`).
- **Browser errors:** `ErrorReportUtils.install()` (`web/src/app/errorReport.utils.ts`, before the app starts)
  sends uncaught errors and rejected promises to `POST /api/client-error`: each different one once, at most five per
  visit, only the stack frames from our own site (none: not sent), room codes in addresses as `CODE`. The server
  cuts them to size, takes 10 a minute in total and logs them as `bamdoodle::client_error` with the release, the
  screen (`start`, `join`, `watch`) and the user agent, never the IP address or room code.
- **Cockpit:** logs kept a year, alerts by email for server errors, a container in error and bursts of browser
  errors, and a usage dashboard. The setup is in [infra/README.md](../infra/README.md) ("Usage, errors and alerts").

## Not now (follow-ups)

- PWA install, a native Android app (the server doesn't care what the client is).
- A limit on rooms per IP address.
- A database, only when there's something worth keeping (stats, custom word packs).
