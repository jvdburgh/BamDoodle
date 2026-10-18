# Game rules

The rules as agreed so far. This is a living document: change it in the same PR as the code that changes the
behaviour, and move answered items out of "Open questions".

## The idea

Everyone in the room draws the same secret word together on one canvas, taking turns. Everyone, that is, except
the **bamboozler**: they don't know the word and have to bluff along while the others try to spot them.

## Where it's played

**Phone first.** Everyone plays on their own phone: join with a link, QR code or room code, and the phone shows
everything you need (the canvas, players and mini-maps, timers, your secret, your vote). Tablets and desktops join the
same way and get a roomier layout.

**Optional host screen.** Like the well-known party-game boxes, someone can also open the room on a TV, beamer or
laptop as a host screen. It shows the shared canvas big, with more detail (players, mini-maps, timers, who is drawing).
It never shows the secret word and doesn't draw. It's a bonus, never required.

## Roles

- **Artists** see the category and the secret word.
- **The bamboozler** sees only the category. They draw along, trying to look like they know the word.
- Exactly one bamboozler per round, picked at random by the server. Nobody but the server knows who it is
  until the reveal.

## A game

A game is a few rounds (the host picks how many, default 5). Every round has a new word and a new bamboozler. After
the last round comes the final scoreboard, with confetti for the winner; the host can start a new game from there. The host
can change the number of rounds between rounds; when that's already been reached, the next start begins a new game.

## A round

1. **Lobby.** Players join with a room code or link, pick a nickname and draw or tweak their avatar while they
   wait. The host sets up the room: mode, turns per player or turn length, rounds per game, the language and the
   word categories to play with (Efteling, Places, Very British, …, and 18+ ones if they want), then starts.
2. **Secret.** The server picks a word from the chosen categories and tells each player their role.
3. **Drawing.** Players take turns on the shared canvas in a shuffled order shown on screen; each player
   gets the same number of turns. The player whose turn it is is highlighted, and their strokes appear live for everyone.
4. **Suspecting, while the drawing goes on.** Any time, a player can point at who they suspect, and change their mind.
   That's public and part of the fun: everyone sees "Noor thinks Jip is sketchy".
5. **Who's sketchy?** After the last turn, everyone makes their final choice: "Who do you think didn't know the word?"
   Your current suspicion is pre-selected; submitting locks it. Voting ends when everyone has voted or after 30
   seconds, and anyone who didn't submit votes for whoever they suspected last (or not at all).
6. **Reveal.** The bamboozler and every vote are shown. The bamboozler gets one chance to guess the word, even when
   everyone caught them.
7. **Results.** Who was right, who was wrong, the points of this round and the scores so far. The host starts the
   next round.

## Turn modes

| Mode | A turn is | The host sets |
| --- | --- | --- |
| **One stroke each** | one stroke (press, draw, release), with a 15 second limit | turns per player: 1 to 5 (default 3) |
| **Timed turns** | free drawing, any number of strokes | seconds per turn: 10, 20 (default), 30 or 60; 2 turns each |

The server enforces the turn: strokes from someone whose turn it isn't, or after the time limit, are dropped.
Simultaneous drawing is parked: it is hard to follow who draws what and much heavier to sync.

## Colours and who drew what

Everyone can use every colour: there is nothing to unlock, ever. To still see who drew what:

- **Live highlight:** the active drawer is clearly marked while they draw.
- **Mini-maps:** next to each player's name, a small canvas shows only *their* strokes. Always visible on desktop.
- **Magnifying glass (spotlight):** click a player (or their mini-map) to highlight their strokes on the main
  canvas while the rest fades back.

If playtests show this isn't enough, a fallback is one colour family per player. We try the free palette first.

## Points (starting point, tune in playtests)

| Who | When | Points |
| --- | --- | --- |
| Artist | final vote for the bamboozler | +1 |
| Bamboozler | guessed the word | +1 |
| Bamboozler | fewer than half of the artists voted for them | +1 |

Split votes need no tie-break: points are per voter, not per majority.

## Words and categories

- English and Dutch, simple and drawable. See [words.md](words.md).
- The host picks which **categories** are in play before starting: everyday ones (Animals, Food, Places, …) and
  themed ones (Efteling, Sinterklaas, Typisch Nederlands, Lekker Nederlands, Very British, Christmas, Fairy tales,
  Landmarks). A new room starts with every category of its language that isn't 18+, themed ones included; the
  host narrows it down.
- **18+ categories** (innuendo and rude-but-drawable words) are categories like any other, marked 18+ and never in
  play unless the host picks them.

## Current defaults (revisit after playtests)

These are implemented in the server (`server/src/limits.rs`) and easy to change:

- **Players:** 3 to start a round, at most 8 in a room. Designed for 4 to 6.
- **Timers:** one-stroke turns 15 seconds, timed turns as set, the final vote 30 seconds, the bamboozler's guess 20
  seconds. There's no separate round timer: the turns decide how long the drawing lasts.
- **Turn order** is shuffled each round and the bamboozler is picked fully at random, so the same player can be it
  twice in a row (any rule about who it can't be would narrow it down). Words don't repeat until the picked categories run out.
- **Everyone votes, the bamboozler too**, so not voting doesn't give them away; their vote earns nothing. Final votes
  stay secret until the reveal; everyone sees who has voted. Suspicions during the drawing are public.
- **The guess** is free text, forgiving about case, accents, spaces and one typo in words of five letters or more.
- **Disconnects:** the round goes on. A drawer who drops loses their turn. A player who drops still counts for the
  vote for 15 seconds (a locked phone shouldn't end it); after that they no longer hold it up. A session token
  takes your seat and score back, and a second device with the same token takes over from the first. After a round,
  the seat of someone who is gone is kept for 2 minutes.
- **Late joiners** watch the current round (no word, no vote) and play from the next one.
- **The host** is whoever created the room; when they drop out, the next player who joined takes over.

## Open questions

- Does the host screen need its own controls (start the next round, kick a player), or is that the host's phone?
- Should timed turns also let the host pick the number of turns per player?
- A computer-controlled bamboozler (the original pitch said "player or AI"): later, if ever.
