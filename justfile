# BamDoodle tasks. `just` lists them; every recipe also works in CI.

default:
    @just --list

# One-time setup after cloning
setup:
    mise trust
    mise install
    pnpm install
    pnpm --dir web exec playwright install chromium firefox
    lefthook install

# Run the server and the web app together (web on :5173 proxies /api and /ws to :8080)
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    (cd server && cargo run) &
    pnpm --dir web dev

# Everything CI runs
check: fmt-check lint typecheck test check-agents

# Every path cited in AGENTS.md, CLAUDE.md, .claude/ and the PR template exists
check-agents:
    node scripts/check-agents.mts

fmt:
    cd server && cargo fmt
    pnpm --dir web format

fmt-check:
    cd server && cargo fmt --check
    pnpm --dir web exec oxfmt --check

lint:
    cd server && cargo clippy --all-targets -- -D warnings
    pnpm --dir web exec oxlint

typecheck: protocol
    pnpm --dir web typecheck

test:
    cd server && cargo test
    pnpm --dir web test

# The web client against a real server: starts one on a spare port and runs the live tests
test-live:
    #!/usr/bin/env bash
    set -euo pipefail
    (cd server && cargo build --quiet)
    port=18089
    (cd server && PORT=$port RUST_LOG=warn exec ./target/debug/bamdoodle-server) &
    server=$!
    trap 'kill $server' EXIT
    curl -sf --retry 30 --retry-connrefused --retry-delay 1 "http://127.0.0.1:$port/api/health" >/dev/null
    BAMDOODLE_SERVER_WS="ws://localhost:$port/ws" pnpm --dir web exec vitest run --project=unit src/protocol/roomConnection.live.test.ts

# Regenerate web/src/protocol/generated from the Rust protocol types
protocol:
    cd server && cargo test --quiet export_bindings

storybook:
    pnpm --dir web storybook

# Clean brand/logo.svg and regenerate the favicon, touch icon and manifest icons in web/public
icons:
    node scripts/brand-icons.mjs

# WebSocket smoke/soak test against a running server, e.g. just soak ws://localhost:8080/ws 1 0
soak url="ws://localhost:8080/ws" rooms="1" minutes="0":
    node scripts/ws-soak.mjs --url {{url}} --rooms {{rooms}} --minutes {{minutes}}

# Production image (linux/amd64, which is what Scaleway runs)
image:
    docker buildx build --platform=linux/amd64 -t bamdoodle:dev --load .

image-run:
    docker run --rm -it -p 8080:8080 bamdoodle:dev
