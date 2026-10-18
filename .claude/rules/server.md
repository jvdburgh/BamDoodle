---
paths:
  - "server/**"
---

# Server

- The server is the referee: validate every client message (turn owner, timing, size, rate) before it changes
  state. A rejected message is dropped and logged at `debug`, never trusted "because the UI prevents it".
- Each room is one tokio task owning its state; talk to it through its channel. No `Mutex` around game state, no
  shared mutable globals besides the room registry.
- Secrets stay server-side: build each player's view per player. A test proves the bamboozler's messages never
  contain the word.
- Errors: `anyhow` at the edges (startup), typed `thiserror` enums inside game logic when callers branch on them.
  No `unwrap()` on input from clients; `expect("why it can't fail")` only for real invariants.
- Time: timers come from tokio (`tokio::time`), and game logic takes the current time as an argument so tests can
  drive it (`tokio::time::pause` in tests).
- Tests next to the code (`#[cfg(test)] mod tests`); game rules get unit tests per rule in
  [docs/game-rules.md](../../docs/game-rules.md).
- `cargo clippy --all-targets -- -D warnings` must pass. Formatting is rustfmt's job, not a review topic.
