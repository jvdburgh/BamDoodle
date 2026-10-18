---
paths:
  - "web/src/**/*.stories.tsx"
---

# Stories

- One `name.stories.tsx` next to the component, `title: "<Domain>/<Component>"`, `satisfies Meta<typeof X>`.
- Play tests assert behaviour the user sees (roles, names, text), through `canvas` queries and
  `expect` from `storybook/test`. No snapshot tests.
- Stories run in Firefox and Chromium (`pnpm storybook:test`) with the a11y addon set to fail on violations.
- Fake server data comes from typed fixtures next to the stories (`_fixtures/` in the domain), never from a running
  server.
