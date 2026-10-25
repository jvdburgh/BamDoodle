---
name: web-ui-patterns
description: web UI bug classes to check first (layout, dialogs, focus, copy seams)
metadata: {type: feedback}
---
- Tailwind: two utilities for one property under the same variant resolve by name, not class order; build CSS and grep. Check room layouts at phone, phone sideways, laptop, and the host at 1280x800/1080p with 8 players.
- Dialogs: cancel preventDefault doesn't hold past a few Esc/back; close via `dialog.close()` so focus returns; a modal hides the page's alerts; userEvent Escape doesn't fire native cancel in tests.
- Focus targets hidden by `@max-*:hidden` no-op; overlays over the canvas while the turn clock runs; pointer input copied outside `usePointerStroke`.
- Parallel work seams: the same moment worded differently on phone and host screen, duplicate button names, one rule copied twice, docs saying "every screen" when one lacks it.
