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

# Regenerate web/src/protocol/generated from the Rust protocol types
protocol:
    cd server && cargo test --quiet export_bindings

storybook:
    pnpm --dir web storybook

# Clean brand/logo.svg and regenerate the favicon, touch icon and manifest icons in web/public
icons:
    node scripts/brand-icons.mjs

# Production image (linux/amd64, which is what Scaleway runs)
image:
    docker buildx build --platform=linux/amd64 -t bamdoodle:dev --load .

image-run:
    docker run --rm -it -p 8080:8080 bamdoodle:dev
