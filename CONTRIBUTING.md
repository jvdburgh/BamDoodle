# Contributing to BamDoodle

Thanks for helping make BamDoodle better. Words, bug reports, ideas and code are all welcome.

## Before you start

- **Small things** (a typo, a few words, an obvious bug): just open a pull request.
- **Bigger things** (a new mode, a new screen, a change to the rules): open an
  [issue](https://github.com/jvdburgh/BamDoodle/issues) first, so we can agree on the idea before you build it. The
  rules live in [docs/game-rules.md](docs/game-rules.md).

## Set up

```bash
just setup   # once
just dev     # server on :8080, web app on http://localhost:5173 (the lab at /lab)
```

You need [mise](https://mise.jdx.dev); it installs the rest (Rust, Node, pnpm, just, lefthook).

## Adding words

Read [docs/words.md](docs/words.md): what makes a good word, where words may come from (only openly licensed
sources) and the file format. Keep each category sorted, one obvious drawable meaning per word, single words except in
the Efteling category. Check your list with:

```bash
python3 -I scripts/words/check.py
```

## Changing code

- [AGENTS.md](AGENTS.md) has the conventions: layout, names, how we test, what not to do. It's written for people
  and coding agents alike.
- [docs/architecture.md](docs/architecture.md) explains how the server, the protocol and the web app fit together.
  The server is the referee: rules and secrets stay server-side.
- Messages between the two live in `server/src/protocol.rs`; run `just protocol` after changing it and commit the
  generated TypeScript.
- New behaviour comes with a test: a Rust unit test, a Vitest test, or a Storybook story with a play test.
- Try what you changed in a browser, Firefox first, and on a phone width.
- `just check` runs everything CI runs. The git hooks check formatting and lint on commit, and clippy, types and the
  agent docs on push; `just fmt` fixes formatting.

## Pull requests

- One change per pull request, with [Conventional Commits](https://www.conventionalcommits.org) messages such as
  `feat(web): …` or `fix(server): …`.
- The [template](.github/PULL_REQUEST_TEMPLATE.md) asks what a player gets from it, a screenshot for anything
  visible, and what you checked.
- By contributing you agree that your code is licensed under the [AGPL v3](LICENSE) and word lists under CC BY-SA 4.0
  ([decision 0004](docs/decisions/0004-licence.md)). The BamDoodle name and logo stay with the maintainer
  ([brand/README.md](brand/README.md)).

Be kind in issues and reviews. It's a party game.
