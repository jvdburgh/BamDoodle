---
paths:
  - "web/src/components/canvas/**"
---

# Canvas

- Pointer Events only: `setPointerCapture` on `pointerdown`, read `getCoalescedEvents()` on every `pointermove`
  (fall back to `[event]` when empty), finish on `pointerup` and `pointercancel`.
- `touch-action: none` on the canvas element only, never on the page.
- A mouse reports `pressure` 0.5: treat that as "no pressure" and let perfect-freehand simulate it.
- Store and send points normalised to 0..1; scale to pixels only when drawing. Canvas buffer = CSS size ×
  `devicePixelRatio`, and redraw when the ratio changes.
- One offscreen canvas per player; the visible canvas, the mini-maps and the spotlight all composite from those
  layers. Redraw from the stroke list, never by reading pixels back.
- Drawing code is imperative and outside React state: React owns the element and the props, a hook or util owns the
  render loop (`requestAnimationFrame`, only while something changed).
- Test in Firefox first.
