# Brand and look

## Name and tagline

- **BamDoodle**: bamboozle + doodle. Written with a capital D.
- Tagline: **Draw • Guess • Deceive** (the dots in berry pink).
- The top left of every screen is the logo with the name and tagline beside it (`BrandLogo named`), and the whole
  block is one link to the start page. In the room, below the laptop layout, the logo stands alone: the word, the
  players and the room code need the space.
- Second line, for the game itself (round start, reveal, loading): **Who's sketchy?** The logo is a sketchy
  character, the game is about finding the sketchy one, and everything is sketched. Use it as a playful question,
  not as the main tagline.
- Never refer to other games or their names in the product, the docs or the marketing.
- Describing it (search results, link previews, the manifest, the README): say what it is first, "a multiplayer
  drawing and bluffing party game in your browser, on phones, tablets and laptops", then how it plays. Never phone-only. Free and open source come after, if at all.
  The link preview card is `web/public/share.png`, rendered by `just share-image`; the tags are in `web/index.html`.

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
- **Display:** **Love Ya Like A Sister** (Kimberly Geswein, SIL OFL 1.1), `@fontsource/love-ya-like-a-sister`,
  the maintainer's pick. Single weight, hand-lettered, a little scruffy. The original pitch used Chaloops, which is
  commercial (Chank Fonts). Picked after comparing these alternatives in the playground, all OFL on Fontsource:
  - Grandstander (`@fontsource-variable/grandstander`): wonky, playful, hand-lettered
  - DynaPuff (`@fontsource-variable/dynapuff`): puffy, very characterful
  - Fredoka (`@fontsource-variable/fredoka`): soft and rounded, calmer
  - Sour Gummy (`@fontsource-variable/sour-gummy`): gummy, slightly quirky
  - Baloo 2 (`@fontsource-variable/baloo-2`): rounded and bouncy
  - Lilita One (`@fontsource/lilita-one`): chunky, single weight

## Paper

The drawing sheet is `paper` (`#f6f5fc`), a cool off-white: every ink colour, including black and night, shows up on
it, and it reads as a lit sheet on the navy table. (A night-navy sheet was tried and dropped: dark inks vanish.)

## Sound

Every sound effect is synthesised in the browser with the Web Audio API (`web/src/components/sound/`): short triangle
and square-wave notes and filtered noise. No effect files, so nothing to license, credit or download.
Every button taps and every choice (a radio or checkbox) picks, app-wide (`SoundPlayer.listenForPresses`); a
control with its own sound (suspect, vote) says so with `data-sound="own"`. Cues: a start jingle, a blip per turn (brighter when it's yours), ticks in the last 3 seconds of a turn and the last 5
of the vote, a falling chime when time's up, and small sounds for picking a colour, finishing a stroke and voting.
Quiet by default, silent until the first tap (browsers require it), and a mute toggle remembered per device.

**Feedback cues** tell each player how the round went for them (`SoundCuesUtils.between`). Right after the reveal's
drumroll: a bouncy "caught them" when your vote was on the bamboozler, a gentle falling sigh when it wasn't (or you
didn't vote); as the bamboozler, a sly tiptoe and wink when fewer than half the artists caught you, a low buzz when
they did. When the round ends, everyone hears the bamboozler's guess: a bright chord when it's right (a quick
victory run for the bamboozler themselves), a short "nope" when it's wrong. Then a coin if you scored, once per round
however many points. After the last round, a win sting if you're on top (a tie counts) and a friendly "good game"
otherwise. A host screen, and someone who wasn't in the round, hears only what's public: the reveal, the guess and,
at the end, the fanfare. Cues of one moment play one after the other, never on top of each other or of cues still
playing (`SoundPlayer.playInTurn`), and muting silences those still waiting too.

**Music:** one quirky detective loop (Pixabay, re-encoded to 96 kbps AAC in `web/public/sounds/`). It is under the
Pixabay Content License, not the AGPL; `web/public/sounds/NOTICE` says so, for forks. It loops the track's audible span
seamlessly (the silence before and the quiet tail after are left out) and keeps playing for as long as the room is
open, and from the start page on (the room picks it up without restarting): softer while someone draws or votes, so the ticks and cues stay clear, and never stopped or restarted by a sound
effect. It has its own Music toggle next to the sound toggle, remembered per device: on by default on the host screen
and on a laptop or desktop, off by default on phones and tablets, so a table full of phones doesn't play it
out of step. Like every sound, it waits for the first tap (the track is already downloaded by then), starts at its
volume at once rather than fading in, and picks up again after the browser suspends audio (a locked phone, a call).

## Feel

Modern, a bit mysterious, colourful. It should feel like a hand-made little game, not a template:

- Navy everywhere, colour as the reward (strokes, avatars, highlights).
- Hand-drawn touches made with our own stroke engine: underlines, borders, icons, the magnifying glass
  (`BrandScribble`), and the doodle faces every avatar starts from.
- "Sketchy" frames: outlines get a slight wobble from an SVG turbulence filter (`BrandSketchyFrame`), on borders
  only, never on text. Who's sketchy? is the playful second line (round start, reveal), not the tagline.
- Sun (`#fbb03b`) is the lamp: it marks whose turn it is and the main action. Berry marks urgency (last seconds).
- No default component-kit look (generic shadcn cards, Inter, purple gradients). Tailwind with our own components
  first; a headless library only where accessibility is hard (dialogs, menus).
- The bamboozler's own logo moves (`BrandLogo sly`): the coat's collar goes up and the hat's colour wedges swirl,
  twice as each round starts, then rest. The logo is inlined from `/logo.svg` for that, never redrawn.
- The fedora is a prop: it drops onto the face of whoever you suspect, sits on the bamboozler's own face on their
  screen, and lands on the bamboozler at the reveal. A spotlight gets a bold, wobbly frame on the sheet and the card.
- The start page's Join and Create buttons wear a sketchy outline in the hat's colours that slowly travels round,
  with doodled icons (a door, a pencil with a plus) that wiggle on hover. The music and sound toggles sit at the top
  right of every screen, the start page included. The top takes two thirds of the screen, so "How to play" always peeks
  out below: doodled cards of about the same length for the three steps (with the points they earn), who wins and
  "Free, on any device", a column on a phone and a grid on a laptop, which is also what search engines read (with FAQ structured data in `index.html`).
- The setup has no groups: every setting has its own heading with a line on what it does under it, and a sketch of
  what's picked beside it. A picked choice (a mode, a number, a category) keeps the same navy background and gets the
  hand-drawn frame in sun and a doodled ✓; the frame traces round in one quick line when you pick, never on load.
  Unpicked categories show a +.
- The name step after the setup and the Join form share one layout: a centered heading, the fields, the main button
  full width, Back under it. After the setup that main button is Play; "Host on this screen" is the quieter choice
  under an "or".
- Small, quick motion makes it feel alive: block buttons tilt and lift on hover and squish when pressed, player cards
  bounce in, "voted" and "suspected by" badges pop, hovering the start page's logo turns its hat's colours one round and back (the logo is inlined from
  `/logo.svg` for that too). Reduced motion turns it off.
- No unlockables, no dark patterns. The only promotion is in the maintainer's voice: one line under the start page and
  the setup ("Made by Joris van der Burgh in the Netherlands / Hosted in the European Union", and "Enjoying
  BamDoodle? Help out on GitHub, and consider donating to Ukrainian citizens"), and on "The End" screen after the
  last round one small card: "Did you enjoy the game?", that it's free with no ads or accounts, a "Donate through
  United24" link (Ukraine's official fundraising platform) and "help out on GitHub", with the footer under it
  (without its own ask, so it isn't said twice). No banner, nothing during a game.
