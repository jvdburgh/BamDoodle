<p align="center">
  <img src="brand/logo.svg" alt="BamDoodle logo" width="160" />
</p>

<h1 align="center">BamDoodle</h1>

<p align="center"><strong>Draw • Guess • Deceive</strong></p>

<p align="center">
  <a href="https://bamdoodle.io"><strong>Play now at bamdoodle.io</strong></a> ·
  <a href="https://github.com/jvdburgh/BamDoodle/releases">Releases</a> ·
  <a href="https://github.com/jvdburgh/BamDoodle/issues">Ideas and bugs</a>
</p>

<p align="center">
  <a href="https://github.com/jvdburgh/BamDoodle/actions/workflows/ci.yml"><img src="https://github.com/jvdburgh/BamDoodle/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

A multiplayer drawing and bluffing party game for your phone. Everyone draws the secret word together on one
canvas, taking turns. Everyone except the **bamboozler**: they don't know the word and bluff their way through, while
the rest try to find out who's sketchy.

Free, with no accounts, no ads, no cookies and nothing to unlock. Open the site on your phones, share a room code and play: around
the table, on a video call, or with the drawing on the big screen at a party.

## How to play

You need 3 to 8 players, each with a phone (or a laptop or tablet).

1. **One of you creates a room** at [bamdoodle.io](https://bamdoodle.io): pick how you draw (one stroke each, or
   timed turns), the number of rounds and the word categories, then your name.
2. **Everyone else joins** with the four-letter room code, or the link the host shares (`bamdoodle.io/CODE`).
   Draw yourself a face while you wait.
3. **Each round**, everyone gets the secret word on their phone. Except the bamboozler, who only sees the category.
   Take turns adding to the drawing; the bamboozler has to blend in.
4. **Feeling suspicious?** Tap someone's face to put the hat on them. Everyone sees who suspects whom.
5. **Who's sketchy?** After the last turn everyone votes with a tap. Then the reveal: the bamboozler gets one guess at
   the word, and everyone scores.
6. **The End:** after the last round, the podium. Play again, or start a new room.

Want everyone to watch the drawing together? Create the room on a laptop or TV and pick **Host on this screen**: it
shows the code, starts the rounds and shows the canvas, the players and the reveal, without anyone's secret, and
doesn't play. The full rules and scoring are in
[docs/game-rules.md](docs/game-rules.md).

**Words:** English and Dutch, from everyday things to Efteling, Very British, Logos, Films, Superheroes, Memes and
more. 18+ categories are there, but only when the host picks them.

## Contribute

Contributions are very welcome, from a single word to a new feature.

- **Words:** more good, drawable words are the easiest way to help. How to add them, and which sources are allowed:
  [docs/words.md](docs/words.md). `python3 -I scripts/words/check.py` checks your list.
- **Ideas and bugs:** open an [issue](https://github.com/jvdburgh/BamDoodle/issues). For a bug, say what you did, on
  which phone or browser, and what you expected.
- **Code:** read [CONTRIBUTING.md](CONTRIBUTING.md), then open a pull request. [AGENTS.md](AGENTS.md) has the
  conventions, for people and coding agents alike.

### Run it locally

Requirements: [mise](https://mise.jdx.dev) (it installs Rust, Node, pnpm, just and lefthook) and Docker for images.

```bash
just setup   # once: tools, packages, browsers for the tests, git hooks
just dev     # the game server on :8080 and the web app on http://localhost:5173
just check   # everything CI runs: formatting, lints, types, tests
```

To try it on your phone, run the server (`cd server && cargo run`) and, next to it, `pnpm --dir web dev --host`
instead of `just dev`, then open the address Vite prints on the same Wi-Fi.

### How it's built

A Rust game server (Axum, tokio, every room in memory) and a React web app (Vite, TypeScript, Tailwind), shipped as
one container on Scaleway in Amsterdam.

- [Architecture](docs/architecture.md): how the pieces fit, the protocol, fair play
- [Game rules](docs/game-rules.md): roles, turns, voting, points
- [Decisions](docs/decisions/): why it's built this way
- [Brand](docs/brand.md): colours, fonts, sound and feel
- [Deploying](infra/README.md): the Scaleway setup and how a release goes out
- [Usage and errors](docs/decisions/0005-usage-and-errors.md): the anonymous counts and error reports we keep, and
  what we never collect

### Run your own

You're welcome to host your own copy on Scaleway: [infra/README.md](infra/README.md) walks through the setup and
says which names to change for a fork. Please give a public fork its own name and logo
([brand/README.md](brand/README.md)).

## Support

Enjoying BamDoodle? Star the repository, tell your friends, and consider
[donating to Ukrainian citizens](https://u24.gov.ua/) through United24.

## Licence

The code is licensed under the [GNU AGPL v3](LICENSE): you can use, change and share it, but if you run a modified
version online you must share your source too. The BamDoodle name and logo are not part of that licence; see
[brand/README.md](brand/README.md). Neither is the background music, which is under the Pixabay Content License; see
[web/public/sounds/NOTICE](web/public/sounds/NOTICE). The word lists are CC BY-SA 4.0
([decision 0004](docs/decisions/0004-licence.md)).
