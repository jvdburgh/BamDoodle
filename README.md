<p align="center">
  <img src="brand/logo.svg" alt="BamDoodle logo" width="160" />
</p>

<h1 align="center">BamDoodle</h1>

<p align="center"><strong>Draw • Guess • Deceive</strong></p>

A free, open-source party game for your browser. Everyone draws the secret word together on one canvas, taking
turns. Everyone except the **bamboozler**: they don't know the word and bluff their way through, while the rest try
to spot them before time runs out.

No accounts, no ads, no colours to unlock. Share a room code with your friends and play, on your laptop or on the
big screen at Christmas.

> **Status:** early days. The repository is set up; the game itself is being built. Follow along in
> [docs/](docs/).

## How it works

- [Game rules](docs/game-rules.md): roles, turns, voting, points
- [Architecture](docs/architecture.md): a Rust game server and a React web app in one container
- [Decisions](docs/decisions/): why it's built this way
- [Brand](docs/brand.md) and [word lists](docs/words.md)

## Develop

Requirements: [mise](https://mise.jdx.dev) (installs Rust, Node, pnpm, just and lefthook) and Docker for images.

```bash
just setup   # once
just dev     # server on :8080, web app on http://localhost:5173
just check   # everything CI runs
```

Contributions are welcome, especially word lists. Read [AGENTS.md](AGENTS.md) for the conventions; it's written for
people and coding agents alike.

## Roadmap

- [ ] Drawing prototype: shared canvas, mini-maps per player, magnifying-glass spotlight
- [ ] Rooms, turns, voting and points over WebSockets
- [ ] English and Dutch word packs, plus an opt-in adults pack
- [ ] Deploy to Scaleway (EU)
- [ ] Later: big-screen mode, installable app (PWA), privacy-friendly EU analytics or none at all

## Licence

The code is licensed under the [GNU AGPL v3](LICENSE): you can use, change and share it, but if you run a modified
version online you must share your source too. The BamDoodle name and logo are not part of that licence; see
[brand/README.md](brand/README.md). Neither is the background music, which is under the Pixabay Content License; see
[web/public/sounds/NOTICE](web/public/sounds/NOTICE).
