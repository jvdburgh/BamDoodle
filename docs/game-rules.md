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

**Passing one device round** (a tablet, or taking turns on one laptop) may become a special mode later; it isn't a
goal for now.

## Roles

- **Artists** see the category and the secret word.
- **The bamboozler** sees only the category. They draw along, trying to look like they know the word.
- Exactly one bamboozler per round, picked at random by the server. Nobody but the server knows who it is
  until the reveal.

## A round

1. **Lobby.** The start page offers two things: **Create a room** or **Join a room**. Creating asks for a nickname
   and the room settings; joining asks for the four-letter room code (shown as "Join at bamdoodle.io with code …" on
   the host's screen) and a nickname, or skips the code when you open a shared link. Players draw or tweak their
   avatar while they wait. The host starts the first round.
2. **Secret.** The server picks a word from the pack and tells each player their role.
3. **Drawing.** Players take turns on the shared canvas in a fixed order shown on screen, for the chosen number of
   laps. The player whose turn it is is highlighted, and their strokes appear live for everyone.
4. **Suspecting runs alongside the drawing.** At any moment a player can mark who they suspect, and change it. It's
   public: every screen shows it ("Noor thinks Jip is sketchy").
5. **Final vote.** After the last turn: "Time's up! Who's sketchy?" for 30 seconds, with your suspicion pre-selected.
   Locking in a vote is final; if you don't, your last suspicion counts. Everyone sees who has voted, not for whom.
6. **Reveal.** The bamboozler and everyone's votes are revealed. The bamboozler then gets one chance to guess the
   word, even when everyone caught them.
7. **Results.** Per player: right or wrong, this round's points and the running scores. The host starts the next
   round with a new bamboozler. After the last round: a final scoreboard with a podium; the host can start a new
   game, which resets the scores.

There is no separate investigation phase: you have to pay attention while the drawing happens.

## Turn modes

| Mode | A turn is | Notes |
| --- | --- | --- |
| **One stroke each** (`classic`) | one stroke (press, draw, release), with a short time limit | Tense, every stroke counts. |
| **Timed turns** (`timed`) | about 10 seconds of free drawing, any number of strokes | More expressive. Gives the bamboozler more clues, so fewer laps. |

The app shows the descriptive names; `classic` and `timed` are the names in code and on the wire. Creating a room
picks the mode with its laps or turn length, the number of rounds, the colours (below), the language and
whether the adults pack is on. The setup shows an estimated duration per round.

The server enforces the turn: strokes from someone whose turn it isn't, or after the time limit, are dropped.
Simultaneous drawing is parked: it is hard to follow who draws what and much heavier to sync.

## Colours and who drew what

Everyone can use every colour: there is nothing to unlock, ever. To still see who drew what:

- **Live highlight:** the active drawer is clearly marked while they draw: a ring around their avatar in the turn
  order, their name in the turn bar, and a name tag that follows their pen tip on the canvas.
- **Mini-maps:** next to each player's name, a small canvas shows only *their* strokes. Always visible, on phones too.
- **Pen tag:** a small chip with the drawer's avatar and name rides on their pen tip on every screen.
- **Magnifying glass (spotlight):** click a player (or their mini-map) to highlight their strokes on the main
  canvas while the rest fades back to grey. Click again or press Esc to show everyone. Hovering a player with a mouse
  previews their spotlight without pinning it.

The room's creator picks **Any colour** (everyone uses every colour, the default) or **Own colours** (each player
gets a family of five shades, and their avatar wears it) when setting up the room, so playtests can compare both.

**Suspecting and voting in the playground:** every player card (avatar, name, mini-map of their strokes) has a
"Mark as sketchy" button; marking or changing it is public table talk ("Noor thinks Jip is sketchy") and cards show
how many suspect that player. After the last turn the same cards turn into the choice ("Pick"), next to a "Time's up!
Who's sketchy? Who do you think didn't know the word?" prompt with a 30 s countdown, your suspicion pre-selected and
a "Lock in my vote" button; it shows who has voted, never for whom. On a laptop everything fits one screen (cards
left, canvas sized to fit, pens and colours docked right, round and turn progress bottom-left); on a phone the cards
or your tools follow the canvas depending on whose turn it is. Then the reveal, the bamboozler's guess, the round's
points with the running totals, and a podium after the last round.

## Points (starting point, tune in playtests)

| Who | When | Points |
| --- | --- | --- |
| Artist | voted for the bamboozler | +1 |
| Bamboozler | guessed the word | +1 |
| Bamboozler | fewer than half of the artists voted for them | +1 |

Split votes need no tie-break: points are per voter, not per majority.

## Word packs

- English and Dutch, simple and drawable, grouped into categories. See [words.md](words.md).
- An **adults pack** (18+, innuendo and rude-but-drawable words) the host can switch on. Off by default.

## Current defaults (revisit after playtests)

These are implemented in the server (`server/src/limits.rs`) and easy to change:

- **Players:** 3 to start a round, at most 8 in a room. Designed for 4 to 6.
- **Timers:** round 60 seconds (the host can pick 30 to 300), Classic turn 15 seconds, Timed turn 10 seconds, the
  bamboozler's guess 20 seconds.
- **Turn order** is shuffled each round and the bamboozler is picked fully at random, so the same player can be it
  twice in a row (any rule about who it can't be would narrow it down). Words don't repeat until the pack runs out.
- **Everyone votes, the bamboozler too**, so not voting doesn't give them away; their vote earns nothing. Votes stay
  secret until the reveal; everyone sees who has voted.
- **The guess** is free text, forgiving about case, accents, spaces and one typo in words of five letters or more.
- **Disconnects:** the round goes on. A drawer who drops loses their turn. A player who drops still counts for the
  vote for 15 seconds (a locked phone shouldn't end the round); after that they no longer hold it up. A session token
  takes your seat and score back, and a second device with the same token takes over from the first. After a round,
  the seat of someone who is gone is kept for 2 minutes.
- **Late joiners** watch the current round (no word, no vote) and play from the next one.
- **The host** is whoever created the room; when they drop out, the next player who joined takes over.

## Open questions

- Does the host screen need its own controls (start the next round, kick a player), or is that the host's phone?
- Should a round have a fixed number of laps instead of (or as well as) a timer?
- A computer-controlled bamboozler (the original pitch said "player or AI"): later, if ever.
