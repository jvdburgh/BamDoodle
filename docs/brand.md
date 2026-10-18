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
- **Display:** to pick in the design prototype. The original pitch used Chaloops, which is a commercial font (Chank
  Fonts), so we need an OFL alternative with the same springy, hand-made feel. Candidates, all OFL and on Fontsource:
  - Grandstander (`@fontsource-variable/grandstander`): wonky, playful, hand-lettered
  - DynaPuff (`@fontsource-variable/dynapuff`): puffy, very characterful
  - Fredoka (`@fontsource-variable/fredoka`): soft and rounded, calmer
  - Sour Gummy (`@fontsource-variable/sour-gummy`): gummy, slightly quirky
  - Baloo 2 (`@fontsource-variable/baloo-2`): rounded and bouncy
  - Lilita One (`@fontsource/lilita-one`): chunky, single weight

## Feel

Modern, a bit mysterious, colourful. It should feel like a hand-made little game, not a template:

- Navy everywhere, colour as the reward (strokes, avatars, highlights).
- Hand-drawn touches made with our own stroke engine: underlines, borders, icons, the magnifying glass.
- No default component-kit look (generic shadcn cards, Inter, purple gradients). Tailwind with our own components
  first; a headless library only where accessibility is hard (dialogs, menus).
- No unlockables, no dark patterns. The only promotion is a small, optional support banner for good causes
  (Mozilla, United24).
