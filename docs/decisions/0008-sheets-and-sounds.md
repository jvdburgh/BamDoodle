# 0008: Native dialogs for sheets, and every button sounds

Status: accepted (2026-10-25)

## Context

The phone room needed a full-screen final vote, and the room a "?" with the rules: modal sheets that trap focus,
handle Esc and Android's back, and give focus back. docs/brand.md allowed a headless library only where
accessibility is hard. Playtesters also found the app silent where it should answer a tap.

## Decision

- Sheets are native `<dialog>` elements opened with `showModal()`, wrapped once in `BrandSheet`
  (`web/src/components/brand/BrandSheet.component.tsx`): without `onClose` it can't be dismissed and reopens if the
  browser closes it anyway (the vote); with `onClose` it closes through the dialog, so focus returns to the opener.
  No headless UI library.
- Every button taps and every choice (radio, checkbox) picks, app-wide, from one click listener
  (`SoundPlayer.listenForPresses`, decided by `SoundCuesUtils.forPress`). A control with its own sound (suspect,
  vote) says so with `data-sound="own"`. Game moments have their own cues from room state (`useRoomSounds`), played
  one after another, never on top of each other.

## Consequences

- No dependency for dialogs; browser support is what Firefox, Chrome, Edge and Safari have had for years.
- New buttons get a sound without anyone remembering to add one; a new control with its own sound must opt out.
- Story tests can't press a real Esc on a dialog, so they close it the way the browser does (`dialog.close()`).
