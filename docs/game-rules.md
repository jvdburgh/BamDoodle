# Game rules

The rules as agreed so far. This is a living document: change it in the same PR as the code that changes the
behaviour, and move answered items out of "Open questions".

## The idea

Everyone in the room draws the same secret word together on one canvas, taking turns. Everyone, that is, except
the **bamboozler**: they don't know the word and have to bluff along while the others try to spot them.

## Where it's played

**Phone first.** Everyone plays on their own phone: join with a link or the room code, and the phone shows
everything you need (the canvas, players and mini-maps, timers, your secret, your vote). Tablets and desktops join the
same way and get a roomier layout.

**Optional host screen.** Like a quiz night, whoever creates the room can host it on a TV, beamer or laptop instead
of playing: after the setup, your name and then **Host on this screen** (or **Play**); the name is needed either way,
so the players read who hosts. The host screen shows the code and
`bamdoodle.io` first, big, then who's in; it starts the rounds and has the room settings, and shows the shared canvas
big during the round. It never shows the secret word and doesn't draw or vote. While it's there, no player hosts; a
host screen that reloads takes the role back (its token is on that device), and one gone for 15 seconds hands the
role to the first player. It's a bonus, never required.

**Passing one device round** (a tablet, or taking turns on one laptop) may become a special mode later; it isn't a
goal for now.

## Roles

- **Artists** see the category and the secret word.
- **The bamboozler** sees only the category. They draw along, trying to look like they know the word.
- **Right in your face** as each round starts, a card says it for a few seconds (shorter for whoever draws first,
  and it lets taps through since their clock is running): "The secret word is
  GIRAFFE. Everyone knows it, except the bamboozler", or "You're the bamboozler!" with the category. Clarity wins over
  a glance across the table. After that the header keeps it: the word, or a small "You're the bamboozler"; the
  bamboozler's own face wears the fedora (on their screen only), and the logo in the corner raises its collar and
  swirls its hat twice (a quiet static badge with reduced motion).
- **"?"** in the room's header opens this room's rules (mode, turns, rounds, words) and how to play, any time.
- Exactly one bamboozler per round, picked at random by the server. Nobody but the server knows who it is
  until the reveal.

## A game

A game is a few rounds (the host picks how many, default 4). Every round has a new word and a new bamboozler. After
the last round comes the final scoreboard, with confetti for the winner; the host can start a new game from there. The host
can change the number of rounds between rounds; when that's already been reached, the next start begins a new game.

## A round

1. **Lobby.** The start page offers **Join a room** (most people) or **Create a room**, with "How to play" below
   (the steps, the points and a few questions). Joining asks for the four-letter
   room code (shown as "Join at bamdoodle.io with code …" on the host's screen) and a nickname, or skips the code when
   you open a shared link (`bamdoodle.io/BKZW`; the address bar shows it once you're in). Creating starts with setting up the
   room: mode, turns per player or turn length, rounds per game, the language and the word categories to play with
   (Efteling, Places, Very British, …, and 18+ ones if they want), in two columns on a wide screen (the round and
   the game on the left, the words on the right) and one on a phone: each setting a heading (Mode, Time per turn
   or Lines per player, Rounds, Language, Categories with how many are picked) with one line on what it does where
   that helps, and a small sketch of what's picked; Back and Next float in a bar at the bottom. The start page and
   the setup both say who it's for: 3 to 8 players. Then the host's nickname (after the setup, so it's clearly
   theirs and not the room's), and only then is the room created, with those settings. The host can open the
   settings again between rounds; every change there reaches the room at once. Then everyone draws their avatar
   (an empty round pad with one pen and the colours that read on navy; Randomize for a doodle face to start from,
   Clear to start over; left empty, they get a random doodle face) and goes to the room. Everyone in the room sees
   each other's faces, also a face finished
   just after a round started. Until a player goes to the room their card says "drawing their face", and the host
   sees "Mo is still drawing their face" next to Start round (they can still start). The others wait on the join card
   until the host starts ("Joris starts the round from the big screen" in a room hosted by a screen).
2. **Secret.** The server picks a word from the chosen categories and tells each player their role.
3. **Drawing.** Players take turns on the shared canvas in a shuffled order shown on screen; each player
   gets the same number of turns. The player whose turn it is is highlighted, and their strokes appear live for everyone.
4. **Suspecting, while the drawing goes on.** Any time, a player can point at who they suspect, and change their mind.
   That's public and part of the fun: everyone sees "Noor thinks Jip is sketchy".
5. **Who's sketchy?** After the last turn, everyone makes their final choice: "Who do you think didn't know the word?"
   A tap on a face is your vote, and another tap changes it until the vote ends. Voting ends when everyone has voted
   or after 30 seconds, and anyone who didn't vote votes for whoever they suspected last (or not at all).
6. **Reveal.** The bamboozler and every vote are shown. The bamboozler gets one chance to guess the word, even when
   everyone caught them.
7. **Results.** Who was right, who was wrong, the points of this round and the scores so far. The host starts the
   next round.

## Turn modes

| Mode | A turn is | The host sets |
| --- | --- | --- |
| **Timed turns** (default) | free drawing, any number of strokes | seconds per turn: 10, 20 (default), 30 or 60; 2 turns each |
| **One stroke each** | one stroke (press, draw, release), with a 15 second limit | turns per player: 1 to 5 (default 3) |

In the app these are named "One stroke each" and "Timed turns" ("Each player draws: once / 2 / 3 … times"); in code
and on the wire they're `oneStroke` and `timed`. The categories are picked as small chips (a picked one gets the hand-drawn sun frame
and a ✓, an unpicked one a +, and the heading counts them: "Categories (12 of 30 selected)"), every
non-18+ category of the room's language ticked by default, 18+ ones marked and only in play when ticked.

The server enforces the turn: strokes from someone whose turn it isn't, or after the time limit, are dropped.
Simultaneous drawing is parked: it is hard to follow who draws what and much heavier to sync.

## Colours and who drew what

Everyone can use every colour: there is nothing to unlock, ever. To still see who drew what:

- **Live highlight:** the active drawer is clearly marked while they draw: a ring around their avatar in the turn
  order, their name in the turn bar, and a name tag that follows their pen tip on the canvas.
- **Mini-maps:** next to each player's name on a laptop, a small canvas shows only *their* strokes. On a phone the
  players are a strip of faces at the top (name, points, the ring on whoever draws, the hat on whoever you suspect, a
  "voted" tag in the vote); a tap opens "See their lines" and "Mark as suspicious" right under it, with who suspects
  them and, after the reveal, who they voted for and their points. The mini-maps are back in the final vote.
- **Pen tag:** a small chip with the drawer's avatar and name rides on their pen tip on every screen.
- **Magnifying glass (spotlight):** tap a player's mini-map to highlight their strokes on the main canvas while the
  rest fades back to grey; the sheet and their card get a bold, wobbly hand-drawn frame, and a "Noor's lines · Show
  everyone ✕" chip on the canvas says why and is the way back (so is tapping the mini-map again, or Esc). Hovering a
  player with a mouse previews their spotlight without pinning it. Suspecting or voting never spotlights anyone.
- **Your own card** stands out (an iris outline and a "you" badge), and your face says "That's you" instead of being a
  button. Cards say who suspects whom by name ("suspected by you and Noor"), in berry when you're one of them.

**Suspecting and voting on screen:** on every player card (avatar, name, mini-map of their strokes) a "Suspect"
button under the name, or a tap on the face itself (hovering it shows the logo's fedora faintly), drops the hat onto
their head; the button then says "Suspected ✓" and another tap takes it off. Marking or changing it is public table
talk ("Noor thinks Jip is sketchy") and cards say who suspects that player. After the last turn the same button says
"Vote" and the face is the vote too: a tap votes for them (the hat drops on, "Your vote ✓"), a tap on another changes
it. The final vote is a sheet over everything on every screen: "Time's up! Who's sketchy?" with a 30 s countdown that
says whose suspicion counts if you don't vote, the finished drawing, and a card per player with their mini-map and a
big Vote button; it shows who has voted, never for whom, and closes when the vote ends. On a laptop everything fits one
screen (cards in one column on the left, the canvas sized to fit with pens and colours right under it, round and turn
progress bottom-left). On a phone: the progress and the strip of faces at the top, the canvas, and on your turn pens
and colours pinned to the bottom (colours in one row that scrolls); on its side, the drawing on the left and the rest
beside it. Then the reveal on the cards themselves: the hat drops
onto the bamboozler, each card says who that player voted for (right or wrong), and once the round is scored each card
pops its points and total. Under the canvas only the headline: who the bamboozler was and their guess (the guess's 20
seconds start at the reveal), then the word and the host's "Next round". After the last round
"The End": the podium with everyone's final score (on a phone when you tap "See the final scores", on the host
screen ten seconds after the results), then what's next (the host plays again in the same room, everyone can create
or join another room), our one ask (if you enjoyed it, support Ukrainian citizens) and the footer with who made
it.

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
  Landmarks), Logos, media (Films, TV shows, Cartoons and comics, Superheroes, Video games), trivia (Memes, Board
  games, Famous people), Tech, Countries and Cities. A new room starts with every category of its language that isn't 18+, themed ones included; the
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
  The word may sit inside a longer guess ("Donald Trump" for Trump, "ice bucket challenge" for ice-bucket), but a
  guess that also names, or is, another word of the same category is wrong ("Wit-Rusland" isn't Rusland), so listing
  words doesn't pay.
- **Disconnects:** the round goes on. A drawer who drops loses their turn. A player who drops still counts for the
  vote for 15 seconds (a locked phone shouldn't end it); after that they no longer hold it up. A session token
  takes your seat and score back, and a second device with the same token takes over from the first. After a round,
  the seat of someone who is gone is kept for 2 minutes.
- **Inactive rooms** close after 30 minutes in which nobody joins, draws, votes or changes a setting (an open tab
  alone doesn't keep a room alive); everyone still there is told the room was closed.
- **Late joiners** watch the current round (no word, no vote) and play from the next one.
- **The host** is whoever created the room; when they drop out, the role waits 15 seconds for them (a refresh or a locked phone)
  and then goes to the next player who joined.

## Open questions

- Should the host screen be able to kick a player?
- Should timed turns also let the host pick the number of turns per player?
- A computer-controlled bamboozler (the original pitch said "player or AI"): later, if ever.
