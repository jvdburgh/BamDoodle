---
name: server-room-patterns
description: server/src/room bug classes to check first
metadata: {type: feedback}
---
- LEAD: client input fanned out to Everyone without its own bound (rate, count, dedupe), also when a once-only message becomes repeatable; Vecs in client structs validated for membership only.
- A new connection role (host screen) must be in every path: Leave, deliver-drop, replace (send `replaced`), screen caps.
- Count limits sized against MAX_MESSAGE_BYTES (compute the worst case); smaller code alphabet = better guess odds (no per-IP join limit); derived state frozen in Finished while settings change; phase changes reached via disconnect skipping follow-up checks.
