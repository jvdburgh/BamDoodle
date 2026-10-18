---
name: protocol-change
description: Add or change a WebSocket message between the BamDoodle server and web app, end to end - Rust type, server validation and limits, regenerated TypeScript types, client handling, tests. Use whenever a feature needs the client and server to say something new to each other.
---

# Changing the protocol

1. **Design the message.** Client → server is an intent (`drawPoints`, `castVote`); server → client is a fact
   (`strokeAdded`, `voteCast`). Decide who may send it, when, how often and how big. Check
   [docs/game-rules.md](../../../docs/game-rules.md): if the rules don't cover it, update them first.
2. **Rust type** in `server/src/protocol.rs`: a new variant on `ClientMessage` or `ServerMessage`, camelCase fields,
   no `Option` unless absence means something.
3. **Server handling** in the room task: validate (turn owner, phase, timing, size, rate), then update state, then
   send per-player views. Secrets stay out of messages to players who mustn't see them.
4. **Tests** (Rust): serialisation shape (JSON with `type`), the happy path, each rejection, and for anything near a
   secret, a test that the bamboozler's view doesn't contain it.
5. **Types:** `just protocol`, then commit `web/src/protocol/generated/` together with the Rust change.
6. **Client:** handle the message in `web/src/protocol/` and the domain component; a story with a fixture shows the
   new state.
7. **Docs:** update `docs/architecture.md` if the flow changed.
8. `just check`.
