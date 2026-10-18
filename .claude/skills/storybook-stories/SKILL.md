---
name: storybook-stories
description: Writing and debugging BamDoodle stories and play tests (Storybook 10, Vitest browser mode in Firefox and Chromium, a11y addon set to fail) - running one file or one browser, typed fixtures against the generated protocol, synthetic pointer events on the canvas, portals, timers, a11y failures, state that leaks between stories. Use when writing a play test or when a story passes in one browser or alone but fails elsewhere.
paths:
  - "web/src/**/*.stories.tsx"
  - "web/.storybook/**"
---

# Stories and play tests

The conventions (one story file per component, `title`, `satisfies Meta`, fixtures) are in rule `stories.md`;
this skill holds the operational detail.

## Running them

- One file, both browsers: `pnpm exec vitest run --project=storybook src/components/<domain>/x.stories.tsx` in
  `web/` (about 2 s). One browser: `--project='storybook (firefox)'` or `'storybook (chromium)'`. One story:
  add `-t "StoryName"`. The verbose reporter (`--reporter=verbose`) prefixes each result with the browser.
- Every story runs twice, once per browser. A failure in one browser only is a real cross-browser bug until proven
  otherwise; Firefox is the primary target, so never "fix" it by skipping Firefox.
- The a11y addon runs in every story with `a11y: { test: "error" }` (`web/.storybook/preview.tsx`): a violation
  fails the test in both browsers. Fix the markup. Only when a rule can't apply (the drawing surface itself), turn
  off that one rule for that story with `parameters: { a11y: { config: { rules: [{ id, enabled: false }] } } }`
  and a one-line reason; never switch the addon off for a file.

## Writing the play function

- `play: async ({ canvas, userEvent, args }) => { … }`: `canvas` is scoped to the story root, `userEvent` comes
  from the context, callbacks in `args` are `fn()` spies to assert on (`await expect(args.onVote).toHaveBeenCalledWith(…)`).
- Query by role and name (`getByRole("button", { name: "Vote" })`), then text. Not by class or test id.
- `await expect(…)` on the critical path; the `expect` from `storybook/test` is instrumented and returns a promise.
  Inside a `waitFor` callback no `await` is needed: `waitFor` retries until it passes or times out.
- Anything rendered into a portal on `document.body` (a dialog, a toast) is outside `canvas`: query it with
  `within(document.body)` or `screen` from `storybook/test`.
- `toHaveClass` compares literally; a regex never matches. Prefer asserting what the user sees over classes at all.

## Fixtures from the protocol

Fake room state and server messages are typed against the generated protocol (`@/protocol/generated/…`) and live
in the domain's `_fixtures/`, so a protocol change breaks the fixture at compile time instead of leaving a story
that renders a shape the server no longer sends. Build them with `satisfies ServerMessage` (or the specific
type), and give the bamboozler's view its own fixture without the word, so the story also shows what that player
really receives. Stories never open a WebSocket: render the presentational component with the fixture as props.

## The canvas

- Pixels differ between Firefox and Chromium (antialiasing), so don't assert on `getImageData`. Test the stroke
  model (normalising, simplifying, batching) as pure `_utils` with `*.test.ts`, and in the story assert what
  surrounds the canvas (the tool picked, the player's turn, the callback fired with points).
- Synthetic pointer events (`userEvent.pointer`, `dispatchEvent`) behave unlike real ones, verified in both
  browsers: `getCoalescedEvents()` returns an empty list (hence the `[event]` fallback in rule `canvas.md`), and
  `setPointerCapture` throws `NotFoundError` in Firefox for any synthetic pointer and in Chromium for any id but
  the mouse's `1`. A play test that dies with `NotFoundError` is the capture call, not the test.
- Coordinates go in as client pixels and come out normalised: compute expectations from the canvas's
  `getBoundingClientRect()`, never from hard-coded pixel values that depend on the story layout.

## Timers and state that outlive a story

- A countdown or round timer takes the deadline (and, where it renders time left, the current time) as props, so a
  story pins it instead of racing the clock or faking it.
- Module-level singletons (a store, a protocol client, a cache) are shared by every story in a file and by all of
  them together on the autodocs page. Set the state each story needs in its own `beforeEach` and return a cleanup;
  a story that replaces file-wide state (its own `render`, different provider) goes in its own file.
- Stop what you started: an animation frame loop, an interval or a reconnect backoff that outlives the last
  assertion keeps running into the next story. Unmount cleanup in the component is the fix, not a longer timeout.

## A prop that is a hook result needs a harness

A prop built by a hook (a room connection, a drawing controller) can only exist inside a component. Define a small
harness in the story file, return it from `meta.render`, and keep `meta.component` the real component so the docs
page documents the right props. A harness used by several story files gets its own file beside them (not in
`_utils/`, which is production code).
