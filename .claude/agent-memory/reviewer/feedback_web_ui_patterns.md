---
name: web-ui-patterns
description: Recurring findings in web UI prototype reviews (pointer input copies, identity colours, wire caps, host-only actions)
metadata:
  type: feedback
---

Check these first; each was a real finding (2026-10-18, lobby avatar editor).

- Pointer stroke input (capture, coalesced events, end/cancel/lost-capture) copied into a component instead of using
  `usePointerStroke` from `canvas/_hooks/`; copies outside `canvas/` also escape `.claude/rules/canvas.md`.
- Player-chosen colours on an identity-coloured background vanish when the colours match; identity colour goes in a
  ring or dot, the face stays navy.
- Client-only data that will later go over the wire (avatars, strokes) needs client caps matching the server limits
  the protocol proposal names (count, points, colour allow-list).
- Playground screens offering host-only actions (start round) to joiners, against docs/game-rules.md.

- Back across a remount (key change, other component) loses focus: an opener ref inside the component can't survive it.
- A flow change documented in game-rules.md but the same flow left stale in architecture.md "Screens and routes".

**Why:** these repeat in UI prototype work while the server side doesn't exist yet.
**How to apply:** lead the review with these; grep for pointer handlers outside `canvas/` and `color=` on AvatarDoodle.
