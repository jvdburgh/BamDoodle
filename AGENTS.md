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
- `just check`: everything CI runs (`fmt-check`, `lint`, `typecheck`, `test`, `check-agents`)
- `just check-agents`: every path cited in this file, `CLAUDE.md`, `.claude/` and the PR template exists
  (`scripts/check-agents.mts`). Rename a file, fix the citation in the same commit.
- `just fmt`, `just protocol` (regenerate TypeScript types from `server/src/protocol.rs`), `just storybook`
- `just test-live`: starts the Rust server and runs the web client's live tests against it
  (`web/src/protocol/roomConnection.live.test.ts`)
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

1. **Size the task.** A one-sentence diff: just do it. Anything else: read the code it touches, write a short plan
   (files, approach, how you'll verify it) and show it before editing.
2. **Ask before guessing, agree before building.** An ambiguous request, gameplay, protocol shape, dependencies,
   data model, hosting or cost: one round of concrete questions, each with your recommended answer, then wait for
   the maintainer. Don't ask what the code can tell you; mechanical work doesn't need a round.
3. **Push back honestly.** If an idea is worse than an alternative, say so with the reason.
4. **The server is the referee.** Secrets (the word, who the bamboozler is) never reach a client that shouldn't see
   them; turn, vote and size limits are enforced server-side. Clients send intents, not outcomes.
5. **Reuse first.** Before adding a component, hook, util or server module, search `web/src/components` and
   `server/src` by behaviour, not by the name you had in mind. Extend what exists; don't wrap, fork or re-implement
   it.
6. **Simplest explicit thing that works.** It's a fun game, not a bank: no abstraction with one caller, no option
   nobody asked for, no defensive fallback for what can't happen, no speculative infrastructure (database, queue,
   cache) before there's a need, no "while I'm here" refactor.
7. **Generic fix, not a local patch.** A bug that can hit another component, message, phase or reconnect path is
   fixed where every caller gets it, and the other paths are checked. Out of scope? Fix the case at hand and list
   the generic fix under Follow-ups. Never a silent one-off.
8. **Test-driven where it pays.** A bug, or a suspected one: first write the test that reproduces it (Rust unit
   test, Vitest unit test or story play test, whichever fits), run it red, then fix, then green. New behaviour
   ships with a test the same way.
9. **Evidence over assertion.** Done means the new test fails without the change and passes with it, `just check`
   is green, and UI was seen in a running browser, Firefox first. Say what ran and what you didn't check.
10. **Show your work.** Before a non-trivial edit, say in two to four lines what you'll change and why. When asking,
    include the code in question, the options and your recommendation, so the question can be answered without
    opening the repo. Report findings as `file:line`.
11. **Living docs.** A change in behaviour updates `docs/` in the same commit. A new decision gets a record in
    `docs/decisions/`.
12. **Follow-ups** go in the PR body under "Follow-ups" or as GitHub issues, not as TODO comments.
13. **Corrected twice on the same point?** The guidance is wrong: fix this file, a rule or a skill in the same PR.

## Conventions

- **Commits:** Conventional Commits, `type(scope): imperative summary`, scopes `server`, `web`, `protocol`, `docs`,
  `words`, `infra`, `ci`, `agents`. Commits are GPG-signed with the maintainer's own identity; don't change git config.
- **Branches:** none for normal work: commit straight to `main` in small, green commits. Only a parallel session in
  its own worktree gets a branch, merged back when it's done.
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
- Hand-edit `web/src/protocol/generated/` or the lockfiles (`pnpm-lock.yaml`, `server/Cargo.lock`).
- Change `LICENSE` or anything in `brand/`: propose it to the maintainer.
- Commit secrets, `.env` files or Terraform state.
- Push, create cloud resources, change DNS or publish anything without the maintainer saying so. Prepare the
  commands instead.
