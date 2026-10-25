---
paths:
  - "web/src/**"
---

# Web

- Components live in `src/components/<domain>/` (`canvas`, `lobby`, `room`, `avatar`, `vote`, `brand`, …); search
  there before adding one. A helper used by a second file moves to the domain's `_utils/` or `_hooks/`.
- Extend the shared component, don't wrap it: a local wrapper that only adds a prop is a missing prop on the shared
  one. A component lives next to its only consumer; shared by siblings, it moves to their common parent; shared
  across domains, it gets its own domain. Folders group by feature, never one folder per component.
- Names: `{Domain}{Kind}`, noun first; `Name.component.tsx`, `name.stories.tsx`, `name.utils.ts` (one exported
  object), `name.hook.ts`. Imports through `@/`.
- Styling: Tailwind utilities and the tokens from `src/index.css` (`bg-night`, `text-berry`, `font-display`). No
  hex colours in components, no inline `style` except for values computed at runtime (canvas sizes, player
  colours).
- Real `<button>`s and links, keyboard reachable, visible focus, a name on every control. Decorative SVGs
  `aria-hidden`.
- State: local state first; a small store only when several distant components need the same live room state. Room
  state comes from server messages; don't duplicate game rules in the client beyond what the UI needs to render.
- No new dependency without asking. Fonts and assets are self-hosted.
- Every component gets a story; behaviour gets a play test. Pure logic in `_utils/` gets a `*.test.ts`.
- One room view per device, laid out by the `room` container: `@5xl/room:` is a laptop, `@max-5xl/room:` a phone,
  and the `sideways` variant (index.css) a phone on its side. Check all three, and the host screen at 1280×800 and
  1080p, before calling a room change done.
- Shared pieces before new ones: `BrandStyles` (buttons, the disabled look), `BrandSheet` (any modal),
  `BrandSketchyFrame`, `BrandScribble` (doodled icons), `RoomViewUtils` (counts, names, "Word N of M",
  `settingsLine`, `roundLines`, `slipsThrough`), `RoomCodeUtils` (codes and room paths). See decision 0008 for sheets
  and sounds: every button sounds by itself; mark a control with its own sound `data-sound="own"`.
- Words in the UI: a **round** is one word, one drawing, one bamboozler and one vote, and on screen it's counted as a
  word ("Word 1 of 3"); a **turn** is your go with the pen ("Turn 1 of 2 each"). One verb per action ("Suspect",
  "Vote"), "Room BKZW", "big screen" for a host screen. The phone and the host screen say the same thing at the same
  moment.
