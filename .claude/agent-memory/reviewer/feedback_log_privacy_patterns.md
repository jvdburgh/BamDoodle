---
name: log-privacy-patterns
description: Checks for usage/error logging and Cockpit (Loki) queries under decision 0005 - what leaks into logs and how LogQL over our JSON behaves
metadata:
  type: feedback
---

First seen 2026-10-18 (decision 0005 review: usage events, /api/client-error, Cockpit rules):
- Full User-Agent kept for years: in-app browsers (Instagram/Facebook) put device model, locale, screen size in it.
  Ask for browser family + major version instead.
- Browser stacks unscrubbed: extension frames (moz-extension://<per-install UUID>) are an ID across visits.
- `| json` over tracing JSON makes `timestamp` (unique per line) a label: every line its own series; name the
  fields to extract.
- Server-side sanitising (page whitelist, cuts) and room_closed reasons shipped without a test that reads the event.

**Why:** decision 0005 promises no personal data and no IDs across visits, kept 5 years.
**How to apply:** on any change to server/src/usage.rs, /api/client-error, errorReport.utils.ts or
infra/scaleway/cockpit/, check each logged field against decision 0005 and each LogQL for label cardinality.
