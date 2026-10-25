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
- Image made decorative (alt="") because text names it, while a responsive class can `hidden` that text: the link
  loses its name on phones (falls to `title`). Hide visually with `sr-only`, or tie alt to visibility.
- A flow change documented in game-rules.md but the same flow left stale in architecture.md "Screens and routes".
- One-shot URL intent (`?start=join`) kept in state forever: a remount (key change, Back from setup) reopens it.
- Copy/UI change to the donate ask without updating docs/brand.md's "only promotion" bullet (plain links, no banner).

**Why:** these repeat in UI prototype work while the server side doesn't exist yet.
**How to apply:** lead the review with these; grep for pointer handlers outside `canvas/` and `color=` on AvatarDoodle.

Seen 2026-10-25 (start page music, e191c31):
- Docs claiming "on every screen" (toggles) while one screen lacks it: grep the component for every screen the route shows (LobbyWaiting).
- Stack-style claims (SoundPlayer.claimMusic) pushed from useEffect: parent effects run after child effects, so a parent re-run puts the parent on top.

Seen 2026-10-25 (phone room, b7b27e8; confirmed by building CSS / Playwright):
- Two utilities for one property under the same variant (`@5xl/room:max-w-none` + `@5xl/room:max-w-[calc..]`): CSS order is by name, not class order, `none` beats `[`. Build to scratchpad and grep.
- `<dialog>` cancel preventDefault doesn't hold: 2nd/3rd Esc (and Android back) closes it in Firefox and Chromium.
- A modal sheet makes the page's `role="alert"` (reconnecting, rejections) inert and hidden behind the backdrop.
- Focus-on-phase effects targeting elements hidden by a responsive `@max-*:hidden` class: focus() no-ops.

Seen 2026-10-25 (BrandSheet/RoomSecretReveal, 208b217; confirmed by scratch story in Firefox+Chromium):
- A `<dialog>` closed by unmounting (Close -> setState) instead of `dialog.close()`: focus lands on body, not the opener.
  Scratch story note: userEvent `{Escape}` does not fire native dialog cancel; call `.close()` to test that path.
- Round-start overlays with pointer-events-auto over the canvas while the server's first turn clock already runs.
