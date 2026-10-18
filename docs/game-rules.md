# Game rules

The rules as agreed so far. This is a living document: change it in the same PR as the code that changes the
behaviour, and move answered items out of "Open questions".

## The idea

Everyone in the room draws the same secret word together on one canvas, taking turns. Everyone, that is, except
the **bamboozler**: they don't know the word and have to bluff along while the others try to spot them.

## Roles

- **Artists** see the category and the secret word.
- **The bamboozler** sees only the category. They draw along, trying to look like they know the word.
- Exactly one bamboozler per round, picked at random by the server. Nobody but the server knows who it is
  until the reveal.

## Devices

Everyone plays on their own device: a laptop or computer first, phones should work too. That is what the game is
designed for.

A **one-device mode** is a special case for later: one tablet passed round, or a big screen everyone draws on in turn.
The drawing prototype has it as "One device" so we can feel the difference, but it isn't the main goal for now.

## A round

1. **Lobby.** Players join with a room code or link, pick a nickname and draw or tweak their avatar while they
   wait. The host picks the mode, the word pack (and whether the adults pack is on) and starts the round.
2. **Secret.** The server picks a word from the pack and tells each player their role.
3. **Drawing.** Players take turns on the shared canvas in a fixed order shown on screen. The player whose turn it
   is is highlighted, and their strokes appear live for everyone.
4. **Voting runs alongside the drawing.** At any moment a player can vote for who they think the bamboozler is.
   A vote is final (no changing it, for now).
5. **The round ends** when everyone has voted or the round timer runs out (starting point: about one minute,
   tuned in playtests).
6. **Reveal.** The bamboozler is revealed. They get one chance to guess the word, even when everyone caught them.
7. **Points** are awarded, then on to the next round with a new bamboozler.

There is no separate investigation phase: you have to pay attention while the drawing happens.

## Turn modes

| Mode | A turn is | Notes |
| --- | --- | --- |
| **Classic** | one stroke (press, draw, release), with a short time limit | Tense, every stroke counts. |
| **Timed** | about 10 seconds of free drawing, any number of strokes | More expressive. Gives the bamboozler more clues, so fewer laps. |

The server enforces the turn: strokes from someone whose turn it isn't, or after the time limit, are dropped.
Simultaneous drawing is parked: it is hard to follow who draws what and much heavier to sync.

## Colours and who drew what

Everyone can use every colour: there is nothing to unlock, ever. To still see who drew what:

- **Live highlight:** the active drawer is clearly marked while they draw: a ring around their avatar in the turn
  order, their name in the turn bar, and a name tag that follows their pen tip on the canvas.
- **Mini-maps:** next to each player's name, a small canvas shows only *their* strokes. Always visible on desktop.
- **Magnifying glass (spotlight):** click a player (or their mini-map) to highlight their strokes on the main
  canvas while the rest fades back to grey. Click again or press Esc to show everyone. Hovering a player with a mouse
  previews their spotlight without pinning it.

If playtests show this isn't enough, a fallback is one colour family per player. We try the free palette first.

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

## Open questions

- Player count: we design for 4 to 6, support 3 to 8? Mini-maps on desktop fit up to 8.
- Classic mode: stroke time limit, and how many laps per round?
- Does the bamboozler vote too (to blend in)? Their vote earns nothing either way.
- The bamboozler's guess: free text with fuzzy matching, or pick from a few options?
- Disconnects: does the round go on, pause, or end when the bamboozler leaves?
- Can late joiners enter mid-round as spectators?
- Big-screen mode: a watch-only view for a TV or Chromecast while people draw on their own devices. Related to the
  one-device mode above, but not the same thing.
- A computer-controlled bamboozler (the original pitch said "player or AI"): later, if ever.
