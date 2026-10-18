# Brand assets

The BamDoodle name, logo (`logo.svg`) and visual identity are **not** covered by the AGPL licence of this
repository. All rights reserved by Joris van der Burgh.

You're welcome to fork the code: please give your fork its own name and logo. See
[docs/decisions/0004-licence.md](../docs/decisions/0004-licence.md).

## Icons

`web/public` holds the icons generated from `logo.svg`: `icon.svg`, `favicon.ico` (16 and 32 px),
`apple-touch-icon.png` (180 px), `icon-192.png`, `icon-512.png` and `icon-maskable-512.png` for the web manifest.
After changing the logo, run `just icons`; the script cleans the SVG, checks it still renders the same and
rewrites all of them.
