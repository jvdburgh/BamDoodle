# BamDoodle

A free, open-source multiplayer drawing party game: everyone draws the secret word together, except the bamboozler,
who bluffs. Rust game server (`server/`) and React web app (`web/`) in one repo, shipped as one container on Scaleway.

This file is the shared guidance for every coding agent. Tool-specific extras live next to it (`CLAUDE.md`,
`.claude/`), but the rules are here.

## Read first

- [docs/game-rules.md](docs/game-rules.md): what the game does. Gameplay changes start there.
- [docs/architecture.md](docs/architecture.md): how it's built and why.
- [docs/decisions/](docs/decisions/): choices that are expensive to reverse. Don't contradict one silently: propose
  a new record.
- [docs/brand.md](docs/brand.md) for anything visual, [docs/words.md](docs/words.md) for word lists.

## Commands

Use `just` (it wraps cargo and pnpm the same way CI does):

- `just setup` once after cloning (mise tools, pnpm install, Playwright browsers, git hooks)
- `just dev`: server on :8080 and Vite on :5173 (proxies `/api` and `/ws`)
- `just check`: everything CI runs (`fmt-check`, `lint`, `typecheck`, `test`)
- `just fmt`, `just protocol` (regenerate TypeScript types from `server/src/protocol.rs`), `just storybook`
- In `web/`: `pnpm storybook:test` (stories in Firefox and Chromium), `pnpm test:unit`, one story file with
  `pnpm exec vitest run --project=storybook <file>`

## Layout

- `server/`: Rust 2024, Axum, tokio. `src/protocol.rs` is the wire contract; rooms run as one task each, all state
  in memory.
- `web/`: React 19, Vite, TypeScript 7, Tailwind 4 (tokens in `src/index.css`), Storybook 10.
  - `src/app/`: shell and routes. `src/components/<domain>/`: one home per domain with `_hooks/`, `_utils/`,
    `_types/` inside. `src/protocol/`: WebSocket client; `generated/` is ts-rs output.
- `brand/`: logo (not AGPL, see `brand/README.md`). `words/`: word packs (planned). `infra/`: Terraform (planned).

## How we work

1. **Agree before building.** Gameplay, protocol shape, dependencies, data model, hosting and cost: propose with a
   recommendation and wait for the maintainer. Mechanical work doesn't need that.
2. **Push back honestly.** If an idea is worse than an alternative, say so with the reason.
3. **The server is the referee.** Secrets (the word, who the bamboozler is) never reach a client that shouldn't see
   them; turn, vote and size limits are enforced server-side. Clients send intents, not outcomes.
4. **Simplest thing that works.** It's a fun game, not a bank: no abstraction with one caller, no option nobody
   asked for, no speculative infrastructure (database, queue, cache) before there's a need.
5. **Reuse first.** Search `web/src/components` and `server/src` before adding something new; extend what exists.
6. **Living docs.** A change in behaviour updates `docs/` in the same commit. A new decision gets a record in
   `docs/decisions/`.
7. **Evidence over assertion.** Done means `just check` is green, new behaviour has a test (Rust unit test, Vitest
   unit test or story play test), and UI was seen in a running browser, Firefox first.
8. **Follow-ups** go in the PR body under "Follow-ups" or as GitHub issues, not as TODO comments.

## Conventions

- **Commits:** Conventional Commits, `type(scope): imperative summary`, scopes `server`, `web`, `protocol`, `docs`,
  `words`, `infra`, `ci`, `agents`. Commits are GPG-signed with the maintainer's own identity; don't change git config.
- **Branches:** `feat/slug`, `fix/slug`, `chore/slug`. `main` is protected by CI.
- **Names (web):** `{Domain}{Kind}` components, noun first (`PlayerMiniMap`, `RoomCodeInput`); files
  `Name.component.tsx`, `name.stories.tsx`, `name.utils.ts` (exports one object, `CanvasUtils.normalise`),
  `name.hook.ts`. Import through `@/`.
- **Names (server):** modules by domain (`room`, `protocol`, `words`), types in `PascalCase`, no `utils.rs` grab bags.
- **Comments:** none by default. One line where a name can't carry the intent. Doc comments for invariants.
- **Protocol:** change `server/src/protocol.rs`, run `just protocol`, commit the generated files. Messages are
  tagged by `type`, fields in camelCase.
- **Styling:** Tailwind utilities and the brand tokens; no hard-coded hex colours in components. No default
  component-kit look.
- **Accessibility:** every control has a name, keyboard works, visible focus, the a11y addon runs in story tests.
  The canvas itself can't be fully accessible; everything around it must be.
- **Browsers:** Firefox is the primary target, then Chrome and Edge. Pointer Events, not mouse or touch events.
- **Language:** product copy in English for now (Dutch word lists exist); keep strings out of logic so i18n can come
  later.

## Don't

- Mention or compare with other games by name in code, copy or docs.
- Load fonts or scripts from Google, Adobe or other third-party CDNs. Self-host through npm.
- Add analytics, tracking, ads or accounts.
- Add non-EU services. GitHub (and Codeberg) are the accepted exceptions.
- Hand-edit `web/src/protocol/generated/`.
- Commit secrets, `.env` files or Terraform state.
- Push, create cloud resources, change DNS or publish anything without the maintainer saying so. Prepare the
  commands instead.
