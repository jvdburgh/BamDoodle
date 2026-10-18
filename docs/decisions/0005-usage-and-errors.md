# 0005: Anonymous usage counts and error reports, in Scaleway Cockpit

Status: accepted (2026-10-18)

## Context

BamDoodle is live, and we want to know two things: whether it's being played, and whether it breaks (on the server,
or in someone's browser). Until now the rule was no analytics at all. The usual answers each bring something we don't
want: a third-party script and cookies (and a consent banner), another EU service to pay for, or a self-hosted tool
with its own database.

The container's logs already reach Scaleway Cockpit (Grafana, Loki and Mimir in Amsterdam), free to collect, and
Cockpit can keep them for up to five years and send alerts by email.

## Decision

- **Usage: anonymous events in the server's own log.** One JSON line per room created, round finished and room
  closed (`server/src/usage.rs`, target `bamdoodle::usage`), with counts and settings only: how many players, the
  mode, the language, how many caught the bamboozler, whether they guessed. Never a name, a room code, a word, a
  guess, an IP address or anything else that points at a person. No cookies, no IDs across visits, nothing in the
  browser.
- **Errors: in the same log.** Server panics are logged as errors. The web app sends uncaught errors and rejected
  promises to our own `POST /api/client-error` (at most five different ones per visit, and 10 a minute for the whole
  server), which logs the message, the stack's frames from our own site, the release, the screen and the user agent
  (cut to 200 characters), without the IP address or room code. Errors with no frame of ours (an extension's) aren't
  sent: their `moz-extension://<id>` frames would be an ID across visits.
- **A budget on the log itself:** the server writes at most 60 lines a minute, whatever anyone sends
  (`server/src/logging.rs`), and drops the rest until the minute is over. The container is a fixed size and isn't
  billed per request, so log storage is the only cost that grows with use, and this caps it. A normal game logs a
  handful of lines.
- **Cockpit** keeps the logs for a year (`just cockpit`) and alerts by email on server errors, a container in
  error and bursts of browser errors (rules in `infra/scaleway/cockpit/`). A Grafana dashboard
  (`infra/scaleway/cockpit/usage-dashboard.json`) counts games, rounds and players.
- No third-party analytics or error tracker, and nothing from another origin in the page.

## Consequences

- Nothing for players to agree to: no cookies, no personal data, so no consent banner.
- About €1 a month: the alert rules (€0.015 a day each) and log storage beyond the free 7 days (€0.002 per GB per
  day, cents at our volume). Scaleway's budget alerts on the organization (50 %, 75 % and 100 %) watch the total.
- Spam can't run up a bill: at most 60 lines a minute of at most a few KB is under 70 MB a day. Even if someone kept
  that up for a whole year, a year of it stored costs about €1.50 a month at the end (under €10 for that year).
  Under such an attack the counts are incomplete for those minutes.
- Counts come from what the server sees: page views without a game aren't counted, and that's fine.
- Every new usage field is checked against this record: anonymous counts and settings only.
- Supersedes the "no analytics" rule in AGENTS.md, which now says what is and isn't allowed.
