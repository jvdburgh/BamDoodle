# syntax=docker/dockerfile:1.7
# One image: the Vite build of web/ served by the Rust server.
# Build from the repo root: `just image`.

FROM node:24-slim AS web-deps
RUN npm install -g pnpm@11.3.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY web/package.json ./web/
RUN pnpm install --frozen-lockfile --filter bamdoodle-web

FROM web-deps AS web-build
# The release, e.g. v0.1.0: shown in the footer and compared with the server's to reload old tabs.
ARG BAMDOODLE_VERSION=dev
ENV VITE_BAMDOODLE_VERSION=$BAMDOODLE_VERSION
COPY web/ ./web/
RUN pnpm --filter bamdoodle-web exec vite build

FROM rust:1-slim AS rust-chef
RUN cargo install cargo-chef --locked
WORKDIR /app

FROM rust-chef AS rust-planner
COPY server/ ./
RUN cargo chef prepare --recipe-path recipe.json

FROM rust-chef AS rust-builder
COPY --from=rust-planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY server/ ./
ARG BAMDOODLE_VERSION=dev
ENV BAMDOODLE_VERSION=$BAMDOODLE_VERSION
RUN cargo build --release --bin bamdoodle-server

FROM debian:trixie-slim AS runtime
COPY --from=rust-builder /app/target/release/bamdoodle-server /usr/local/bin/bamdoodle-server
COPY --from=web-build /app/web/dist /app/static
COPY words/ /app/words
ENV PORT=8080 RUST_LOG=info STATIC_DIR=/app/static WORDS_DIR=/app/words
EXPOSE 8080
USER nobody
ENTRYPOINT ["bamdoodle-server"]
