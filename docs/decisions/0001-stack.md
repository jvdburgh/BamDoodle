# 0001: Rust server, React + Vite web app, one image

Status: accepted (2026-10-18)

## Context

A real-time multiplayer browser game for small rooms, built by one developer as a hobby and learning project. It
must be fast, cheap to host, work best in Firefox, and be pleasant to work on with AI coding agents.

## Decision

- **Server:** Rust with Axum and tokio WebSockets. Already familiar from AmputatorBot, small memory footprint, one
  binary.
- **Web:** React 19 + Vite + TypeScript 7, Tailwind 4, Storybook with Vitest browser tests (Firefox and Chromium).
  Familiar, and the canvas does the heavy lifting outside React anyway. No Next.js: SSR adds a Node runtime for no
  gain in a WebSocket app. Lit, Vue and Svelte were considered; none buys enough to give up familiarity.
- **Shared types:** ts-rs generates TypeScript from the Rust protocol.
- **Tooling:** oxfmt + oxlint, `tsc` (TypeScript 7, the Go compiler), cargo fmt + clippy, just, mise, lefthook,
  pnpm workspaces, GitHub Actions.
- **No Compose Multiplatform or native app for now:** a responsive web app covers desktop and mobile browsers.

## Consequences

Two languages in one repo, glued by generated types. A native client later only needs to speak the same protocol.
