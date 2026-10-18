# Brand and look

## Name and tagline

- **BamDoodle**: bamboozle + doodle. Written with a capital D.
- Tagline: **Draw • Guess • Deceive** (the dots in berry pink).
- Never refer to other games or their names in the product, the docs or the marketing.

## Colours

From `brand/logo.svg`, exposed as Tailwind tokens in `web/src/index.css`:

| Token | Hex | Use |
| --- | --- | --- |
| `night` | `#080357` | Background, always. Dark, mysterious. |
| `berry` | `#f13866` | Accent, tagline dots |
| `violet` / `plum` | `#af2cbe` / `#9753a0` | |
| `iris` / `denim` | `#5651fb` / `#3d56a5` | |
| `lagoon` | `#2da8c3` | |
| `forest` / `moss` | `#239447` / `#1c7d3c` | |
| `lime` | `#7ec42e` | |
| `sun` / `amber` | `#fbb03b` / `#f7a33a` | The trench coat |

The logo pairs every colour with a slightly darker shade; that pairing is a good pattern for buttons and states.

## Fonts

All self-hosted through Fontsource npm packages. No Google Fonts CDN (privacy, GDPR) and no Adobe.

- **Body:** Work Sans (Wei Huang, SIL OFL 1.1), `@fontsource-variable/work-sans`. Already installed.
- **Display:** Grandstander (Tyler Finck, SIL OFL 1.1), `@fontsource-variable/grandstander`, wired to `--font-display`
  (`font-display` in Tailwind). Chosen in the drawing prototype from the OFL shortlist below, as the closest to the
  springy, hand-lettered feel of the original pitch's Chaloops (commercial, so not usable). It stays readable at UI
  sizes (player names, timers, buttons), where DynaPuff got blobby and Fredoka and Baloo 2 felt too calm.
  Also considered: DynaPuff, Fredoka, Sour Gummy, Baloo 2, Lilita One (all OFL, all on Fontsource).

## Paper

The drawing sheet is `paper` (`#f6f5fc`), a cool off-white: every ink colour, including black and night, shows up on
it, and it reads as a lit sheet on the navy table. The canvas is the only large light area on screen.

## Feel

Modern, a bit mysterious, colourful. It should feel like a hand-made little game, not a template:

- Navy everywhere, colour as the reward (strokes, avatars, highlights).
- Hand-drawn touches made with our own stroke engine: underlines, borders, icons, the magnifying glass
  (`BrandScribble`), and the placeholder doodle avatars.
- Sun (`#fbb03b`) is the lamp: it marks whose turn it is and the main action. Berry marks urgency (last seconds).
- No default component-kit look (generic shadcn cards, Inter, purple gradients). Tailwind with our own components
  first; a headless library only where accessibility is hard (dialogs, menus).
- No unlockables, no dark patterns. The only promotion is a small, optional support banner for good causes
  (Mozilla, United24).
