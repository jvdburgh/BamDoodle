# 0006: A room can be hosted by a screen that doesn't play

Status: accepted (2026-10-25)

## Context

In the first playtests the TV mode didn't work: the creator opened the room on a TV as a "host screen", but the host
was still a player, so the TV showed their word and role to the room, and they had to join again from a phone.
Party games of this kind usually let a big screen run the game without being a player.

## Decision

- After the setup the creator picks **Play on this phone** or **Host on this screen**, with their name either way.
  `hostRoom { name, settings }` creates a room hosted by that screen; `RoomSnapshot.hostScreen` carries the host's
  name so players read "Joris starts the round from the big screen".
- The host screen gets a session token (in `joined`) and reconnects with `watchRoom { code, sessionToken }`: a reload
  or a second tab takes the role back (the old connection hears `replaced`). Without the token a screen only watches.
- While the host screen is connected no player hosts; its `updateSettings` and `startRound` count like a host
  player's and anything else it sends is dropped. Gone for `HOST_GRACE`, the first connected player takes over
  (`hostChanged`), as for a player host. A hosting screen keeps its room open; watching screens don't, and are capped
  at four (the host screen always gets back in).
- It is a `Viewer::Screen`: it never gets the word or a role, and isn't in the turn order.
- "Show on a TV" (a player's extra screen) is gone; a host player's phone still plays as before.

## Consequences

- A TV or laptop works like a quiz-night screen: code and QR first, the drawing big, a scoreboard, and nobody's secret.
- One more connection role on the server (`hosting` on a screen connection) that every drop, replace and cap path has
  to handle; tests cover each.
- The host's name is the only thing the screen sends about a person; it's checked like a player's name.
