# 0003: Scaleway Serverless Containers, Instance as fallback

Status: accepted and verified (2026-10-18)

## Context

EU hosting, budget up to about €20 a month, ideally a few euros. AmputatorBot already deploys to Scaleway Serverless
Containers with Terraform and GitHub Actions.

What the Scaleway docs say (checked 2026-10-18):

- WebSockets are supported ([FAQ](https://www.scaleway.com/en/docs/serverless-containers/faq/)).
- A request, and so presumably a WebSocket, lasts at most the configured timeout, 10 s to 60 min
  ([limitations](https://www.scaleway.com/en/docs/serverless-containers/reference-content/containers-limitations/)).
- At most 80 concurrent requests per instance. If every socket counts, one instance holds about 80 players.
- Deploys start a new instance, so in-memory rooms are lost on deploy
  ([autoscaling](https://www.scaleway.com/en/docs/serverless-containers/reference-content/containers-autoscaling/)).
- Idle behaviour of open WebSockets, and sticky routing, are not documented.

Rough cost (Paris, excluding VAT): 140 mvCPU / 256 MB always on is about €5 a month (about €2 with the free tier,
which is shared with AmputatorBot). A STARDUST1-S Instance is about €0.45 a month plus about €2.90 for a public IPv4
([pricing](https://www.scaleway.com/en/pricing/virtual-instances/)).

## Decision

Start on a Serverless Container with `min_scale = 1`, `max_scale = 1`, 140 to 280 mvCPU, with the custom
domain on `bamdoodle.io` (the apex needs CNAME flattening or ALIAS at the DNS provider) or else `play.bamdoodle.io`. Before building the game for real, run a
small WebSocket soak test (long-lived sockets, idle sockets, 100 concurrent sockets, a deploy during a game).

Fallback if that test disappoints: a STARDUST1-S or DEV1-S Instance with Docker and Caddy for TLS, about €3.50 to
€9.50 a month.

## Consequences

- Clients must reconnect transparently (needed anyway).
- Deploy when no games are running.
- DNS: Scaleway Domains & DNS can host the existing domain (about €5 a month per zone at the time of writing) if we
  want to move off a non-EU DNS provider.

## Verified (2026-10-18)

The soak test (`scripts/ws-soak.mjs --rooms 20 --screens 1 --idle 3 --minutes 55`) against the live container in
nl-ams: 92 WebSockets (above the documented 80 concurrent requests) held open for 55 minutes, including silent ones,
with 0 drops; ping round trip p50 83 ms, p95 180 ms, max 290 ms from a Dutch home connection. The Instance fallback
isn't needed.
