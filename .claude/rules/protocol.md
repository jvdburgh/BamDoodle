---
paths:
  - "server/src/protocol.rs"
  - "web/src/protocol/**"
---

# Protocol

- `server/src/protocol.rs` is the only source of truth for messages. Change it there, run `just protocol`, commit
  the regenerated `web/src/protocol/generated/` in the same commit. CI fails on stale types.
- Messages: `#[serde(tag = "type", rename_all = "camelCase")]` enums, camelCase fields, `#[ts(export)]`.
- Client messages are intents ("drawPoints", "castVote"), server messages are facts ("strokeAdded", "voteCast").
- Every new client message gets a server-side limit (size, rate, who may send it when).
- Coordinates on the wire are normalised to 0..1 and rounded (3 to 4 decimals) to keep payloads small.
- Load the `protocol-change` skill for the full checklist.
