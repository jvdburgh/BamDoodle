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

# The link preview card (web/public/share.png) from the logo and the brand fonts
share-image:
    node scripts/share-image.mjs

# Cockpit for the live game (decision 0005): keep its logs and metrics a year and push the alert rules in
# infra/scaleway/cockpit/. Safe to run again. Needs `scw init` with access to the bamdoodle project.
cockpit:
    #!/usr/bin/env bash
    set -euo pipefail
    region=nl-ams
    project=$(scw account project list name=bamdoodle -o json | python3 -c 'import json, sys; print(json.load(sys.stdin)[0]["id"])')
    sources=$(scw cockpit data-source list project-id="$project" origin=scaleway region=$region -o json)
    source_of() { echo "$sources" | python3 -c "import json, sys; s = [d for d in json.load(sys.stdin) if d['type'] == '$1'][0]; print(s['id'], s['url'])"; }
    read -r logs_id logs_url < <(source_of logs)
    read -r metrics_id metrics_url < <(source_of metrics)
    scw cockpit data-source update "$logs_id" retention-days=365 region=$region > /dev/null
    scw cockpit data-source update "$metrics_id" retention-days=365 region=$region > /dev/null
    echo "Scaleway Logs and Metrics: kept 365 days"
    key=$(scw config get secret-key)
    push() { curl -fsS -X POST -H "X-Auth-Token: $key" -H "Content-Type: application/yaml" --data-binary "@infra/scaleway/cockpit/$1" "$2" > /dev/null && echo "pushed $1"; }
    push logs-rules.yaml "$logs_url/loki/api/v1/rules/bamdoodle"
    push metrics-rules.yaml "$metrics_url/prometheus/config/v1/rules/bamdoodle"

# WebSocket smoke/soak test against a running server, e.g. just soak ws://localhost:8080/ws 1 0
soak url="ws://localhost:8080/ws" rooms="1" minutes="0":
    node scripts/ws-soak.mjs --url {{url}} --rooms {{rooms}} --minutes {{minutes}}

# Production image (linux/amd64, which is what Scaleway runs)
image:
    docker buildx build --platform=linux/amd64 -t bamdoodle:dev --load .

image-run:
    docker run --rm -it -p 8080:8080 bamdoodle:dev
