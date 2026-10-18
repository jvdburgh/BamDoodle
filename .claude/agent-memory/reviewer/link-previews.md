---
name: link-previews
description: Checks for SEO/link-preview changes in web/index.html, web/public/robots.txt and server/src/lib.rs static serving
metadata:
  type: project
---

Room links (/join/CODE, /watch/CODE) are shared in chats; robots.txt Disallow on them stops Twitterbot and LinkedInBot from fetching the card. Static index.html means every route gets the homepage tags.
**Why:** first found in the 2026-10-18 SEO review.
**How to apply:** on any robots.txt, route or meta-tag change, check preview bots can still fetch shared room links; check server/src/lib.rs tests that cite public files as "missing".
