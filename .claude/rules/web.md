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
