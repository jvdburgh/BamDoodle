# 0002: Game state in memory, no database

Status: accepted (2026-10-18)

## Context

Rooms live for minutes to an hour. Nothing needs to survive beyond a session: no accounts, no history.

## Decision

Rooms, players, strokes, votes and scores live in the server process: a registry of rooms, one tokio task per room
owning its state. Players reconnect with a session token kept in `localStorage`.

## Consequences

- Zero database cost and nothing to back up.
- Exactly one server instance (no sharing state between instances).
- A deploy or crash ends running games. Acceptable at hobby scale.
- Revisit when we want something persistent (stats, custom word packs).
