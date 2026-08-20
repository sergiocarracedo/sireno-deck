# AI Prompt — Build the Sireno Deck Marketing Website

## What you're building

A marketing website for **Sireno Deck**, an open-source, Linux-first Elgato Stream Deck manager. The site has a landing page (the focus) plus a docs site. The aesthetic is a direct homage to **gladia.io** — dark hero, sticky nav, big stat row, numbered "How it works", alternating feature deep-dives, comparison table, CTA banner, dense footer. The Sireno Deck brand uses the red fish-fin logo and a dark slate palette with cool blues and warm grey accents.

The user-facing copy, sitemap, and deck captures are already finalized. **You are not writing copy** — copy is provided verbatim below. You're translating the structural layout and copy into a Stitch design (or equivalent tool) that will be exported as a responsive web page.

---

## Section 0 — Brand assets

### Logo

- File: `packages/cli/src/assets/logoFull.png` (full mark: red fin + "Sireno Deck" wordmark, white background)
- File: `packages/cli/src/assets/logo.png` (mark only — red fin)
- File: `packages/cli/src/assets/logo72x72.png` (small icon, 72×72)
- The "fin" is a stylized fish tail / wave in red gradient, with a chevron-scale pattern. The wordmark "Sireno Deck" is brushed-silver with red accents on the "S" and the inner counter of the "e".
- In the website, use the **mark only** in the nav bar (and as favicon) and the **full mark** (logo + wordmark) in the footer and the hero. Reverse the mark to all-white on the dark hero.

### Brand colors (from the project's default theme — `packages/cli/src/themes/default/sirenodeck.json`)

```
--sireno-bg              #2e3540   /* deep slate, hero background */
--sireno-frame           #53738B   /* muted blue-grey, dividers */
--sireno-fg               #eef2f7   /* off-white, primary text */
--sireno-fg-contrast      #333333   /* dark text on light sections */
--sireno-primary          #7dd3fc   /* sky blue, primary accent (links, CTAs) */
--sireno-accent           #C3F5FF   /* pale cyan, highlight */
--sireno-muted            #b8bfc8   /* secondary text */
--sireno-success          #34d399   /* green, success accent */
--sireno-danger           #FFB4AB   /* coral, error accent */
```

**Logo red** (sampled from the fin): gradient from `#7a0a0a` (deep crimson) → `#d62828` (vivid red) → `#f8a5a5` (soft pink highlight). Use a single solid `#d62828` for the stylized logo/wordmark on the website — the gradient is only in the raster asset.

### Typography

- **Wordmark** (logo): the existing brushed-silver font from the asset — use it as-is for the logo lockup, do NOT try to redraw it.
- **Body / UI**: serif with editorial confidence — pair something like **Newsreader** (body) + **JetBrains Mono** (code) + **Inter** (UI labels). Gladia uses a clean sans-serif throughout; lean toward that for headings but pick a serif body for editorial weight if the tool supports it. If the tool restricts to one family, use **Inter** at 400/500/600/700.
- **Eyebrow / kbd**: uppercase, tracked, 12–13px, `letter-spacing: 0.12em`.

### Visual idioms (from Gladia.io)

- Dark hero on the slate background; subhead in pale cyan (`#C3F5FF`); CTAs as solid sky-blue pills with a soft glow.
- Section transitions: alternating dark slate and slightly darker `#262b35` panels.
- "How it works" steps: large numeric badge (48px) in pale cyan, with text alongside.
- Feature deep-dives: 2-column with a left text column and a right image (deck mockup) column.
- Comparison table: dark header row, alternating row stripes, checkmark/dash cells.
- CTA banner: full-bleed gradient between `#d62828` and `#2e3540`, with the white logo on the left.
- Footer: 5 narrow columns, separated by 1px `#53738B` dividers, dense link list, small logo mark at the bottom-left.
- Decorative motif: the **chevron-scale pattern** from the logo (the red triangles on the fin) can be reused as a subtle background watermark on the hero and the CTA banner — at 4–6% opacity, tiled, in red.

---

## Section 1 — Site map

```
/                          Landing (this is the focus)
/docs                       Docs landing — 6 chapter cards
/docs/getting-started       Install + first run + CLI cheatsheet
/docs/configuration         config.yml anatomy
/docs/builtin-addons        Per-addon reference
/docs/themes                Theme tokens, built-in + 3rd-party
/docs/addon-authoring       Manifest API + publishing
/docs/keyboard-macros       macro:// / type:// / host placeholders
/docs/protocol              WS bridge reference table
```

For Stitch export, the docs pages can be **placeholder shells** with the page title and a "Coming soon" note — the focus is the landing page. Each docs page should have the same nav and footer as the landing.

---

## Section 2 — Information architecture for the landing page

The landing page has 12 sections, top-to-bottom:

1. **Sticky nav** — slim, dark, with the red fin mark on the left, then links: `Product` · `Themes` · `Addons` · `Docs` · `GitHub`, ending with a sky-blue `Get started` CTA button.
2. **Hero** — full-bleed dark slate. Eyebrow + H1 + subhead + two CTAs + a deck-mockup image on the right (or below on mobile).
3. **Stat row** — 4 numbers across full width, separated by thin grey dividers.
4. **How it works** — 4 numbered steps in a row.
5. **Features grid** — 3×2 cards with icons, title, body.
6. **Theme showcase** — side-by-side "Default dark" / "Light" deck mockups with a short caption each.
7. **Addon ecosystem** — 3-column tile grid for 8 addons.
8. **Contextual overlay** — annotated screenshot of an app-specific overlay (e.g. OpenCode commands) appearing on top of the main deck.
9. **Keyboard macros** — code block (YAML) + a deck mockup side-by-side.
10. **Comparison table** — Sireno Deck vs Elgato Stream Deck vs Loupedeck, 10 rows.
11. **CTA banner** — full-bleed gradient, "Make your Stream Deck feel like yours." + two CTAs.
12. **Footer** — 5 columns + bottom bar with the full logo lockup, copyright, and compliance tags.

---

## Section 3 — Page-by-page content (copy verbatim)

### Top nav

- Left: red fin mark (32px tall) linking to /
- Links: `Product` · `Themes` · `Addons` · `Docs` · `GitHub`
- Right CTA: `Get started` (filled sky-blue, hover glow)

### Hero

- **Eyebrow:** `Your Stream Deck, your way`
- **H1:** `A Stream Deck that's truly yours.`
- **Subhead:** `Sireno Deck turns your Elgato Stream Deck into something you'd actually want to use — every button consistent, every screen themed, every shortcut exactly where you expect it. Configure it once in plain text, and it works the same on your desk, in the browser, and on the device.`
- **Primary CTA:** `Get started` (filled sky-blue, large)
- **Secondary CTA:** `See the docs` (ghost button, white outline)
- **Right side:** a screenshot of the Sireno Deck UI — the canonical hero image referenced as `packages/cli/docs/screenshots/emulator-main-deck.png` (5×3 tile grid showing the user's actual main deck with system stats, clock, weather, emojis, music, overlay toggle, etc.)
- **Background:** `#2e3540` with a 4–6% opacity red chevron-scale watermark in the top-right corner

### Stat row (4 columns, no section heading)

- `8 button types ready to use`
- `2 themes, plus any you want`
- `Same look on screen and on device`
- `Free and open source`

### "How it works" — 4 numbered steps, single row

1. **Describe your deck** — Tell Sireno Deck what you want each screen to show — clocks, apps, shortcuts. Plain text.
2. **Press start** — One command and it's running in the background. It picks up your settings and stays up.
3. **Tap a button** — Click in the browser to test, or press the physical key on your device. Same behavior either way.
4. **It keeps updating** — System stats refresh by themselves. Time moves. Weather updates. The deck stays alive.

### Features grid (3×2 = 6 cards, dark slate panel)

Each card has a small icon (24px), bold title, 2-line body, and a "Learn more" link.

1. **Built-in button types** — _"Every button you actually need, already included. Play and skip music without leaving your keyboard. Glance at your CPU and RAM. Drop in an emoji with one tap. Show the time, the date, the weather. Open apps, run scripts, switch profiles. Eight button types ship out of the box — turn them on, drop them onto your deck, done."_

2. **Linear navigation** — _"Back, forward, that's it. Tap to step into a screen, tap to come back. Every deck is just a flat list — no menus buried three levels deep. When a sub-screen pops up (because you opened a particular app, say), it remembers where you were before, so you can bounce between contexts without losing your place."_

3. **Themable — two built-in, plus yours** — _"One look across your whole desk. Pick a dark look or a light look out of the box, and every button matches — fonts, colors, corners. Don't like either? Make your own. Drop a theme folder into your config, or install one like any other app. Your deck, your colors."_

4. **Extend it without forking** — _"Need a button that doesn't exist yet? Add it. Sireno Deck is built to be extended. Anyone can publish a small package that adds a new button type — a Pomodoro timer, a Jira ticket tile, an OBS scene switcher — and it'll appear in your deck alongside the built-ins. No patching the app. No waiting for a release."_

5. **Decks that know what you're doing** — _"The right buttons when you need them. Open VS Code and your editor shortcuts appear. Switch to Chrome and your tab and window controls show up. Open a chat app and your most-used emoji and quick replies are right there. When you close the app, your normal deck comes back. No setup menus, no profiles to remember — it just does the right thing."_

6. **Buttons that do things on your computer** — _"A button is anything you can type. Open a URL. Launch an app. Send a keystroke — a shortcut, a phrase, even an emoji. Hold a key to do something different from tapping it. Mix and match: a single button can launch Spotify, send a key combo, and then type your playlist name. Your deck becomes a remote control for your whole computer."_

### Theme showcase section

- **Heading:** `Two looks out of the box. Make it your own.`
- **Subhead:** `Every theme — built-in or third-party — gives every button the same fonts, the same colors, the same corners. So your deck always feels like one product, not ten.`
- **Two cards side-by-side:**
  - Card 1: caption `Dark` / body `The default. Calm, low-glare, easy on the eyes during long sessions.` + image of the deck in dark theme
  - Card 2: caption `Light` / body `Bright and clear. Good for daytime, presentations, or just preferring paper over pixels.` + image of the deck in light theme

### Add-on ecosystem section

- **Heading:** `Buttons that grow with you.`
- **Subhead:** `Eight button types ship today. Anything else, someone in the community has probably already built it — and if not, you can.`
- **8 tiles in a 3-column grid:**
  - **Media** — Play, pause, skip, volume, mute. Works with any player your OS sees.
  - **System status** — CPU, RAM, disk, network, temperature. Pick what you want to see.
  - **Weather** — Current temperature and conditions for any city. Updates on its own.
  - **Date & time** — Digital clock, big clock, calendar, or an analog face. Your call.
  - **Emoji picker** — Eleven categories, search, your favorites at the top. Tap to type.
  - **Value display** — Show anything you can print — uptime, disk space, build status.
  - **App shortcuts** — A pre-made set of decks that appear when you open VS Code, Chrome, Slack, Discord, Teams, Meet, OpenCode, or Claude Code.
  - **Pomodoro** — A focus timer tile. Tap to start, tap to reset, hold for a long break.

### Contextual overlay section

- **Heading:** `Your deck reacts to what you're doing.`
- **Subhead:** `When you focus a specific app, Sireno Deck notices and slides in the right buttons for it. When you leave, your regular deck comes back. No mode switching. No menus.`
- **Image:** annotated screenshot of an overlay deck (e.g. OpenCode) appearing on top of a faded main deck, with three callouts:
  - `Main deck underneath — still there.`
  - `Your app-specific buttons on top.`
  - `Tap to step back, double-tap to dismiss.`

### Keyboard macros section

- **Heading:** `Buttons that work like you do.`
- **Subhead:** `Send a keystroke. Type a phrase. Open an app. Or chain them all together.`
- **Three bullets:**
  - `Send any shortcut — single keys or combos. Add a tiny pause between steps when you need to.`
  - `Type text verbatim. Emojis, accents, anything your keyboard can produce.`
  - `Run any command your shell understands. Pipe, redirect, chain.`
- **Right side:** a deck mockup showing a button with a macro icon and a small "tap" hint

### Comparison table (10 rows)

Section heading: `Open-source, Linux-first, file-as-config.`
Subhead: `Side-by-side, so you don't have to take our word for it.`

| Feature                        | Sireno Deck                             | Elgato Stream Deck Software | Loupedeck          |
| ------------------------------ | --------------------------------------- | --------------------------- | ------------------ |
| Works on Linux                 | **Yes, first-class**                    | No                          | No                 |
| Configure in plain text        | **Yes**                                 | Click-only                  | Click-only         |
| Track changes in git           | **Yes**                                 | No                          | No                 |
| Themes (fonts, colors, layout) | **Two built-in, plus install your own** | A few skins                 | Profiles only      |
| Add new button types           | **Anyone can publish one, like an app** | Closed marketplace          | Closed             |
| Buttons change by app          | **Yes — automatically**                 | Manual profiles             | Manual profiles    |
| Tap / double-tap / hold        | **All three, per button**               | Tap and hold                | Tap and hold       |
| Type emoji and special chars   | **Yes**                                 | No                          | No                 |
| Try without the device         | **Yes — full browser preview**          | No                          | No                 |
| Price                          | **Free**                                | Free (with device)          | Free (with device) |

### CTA banner

- Full-bleed gradient (red `#d62828` left → slate `#2e3540` right) with the white logo on the left
- **H1:** `Make your Stream Deck feel like yours.`
- **Subhead:** `One config file. Eight button types. Two themes. Your deck, in your dotfiles, version-controlled like the rest of your setup.`
- **Primary CTA:** `Get started` (white filled, dark text)
- **Secondary CTA:** `Read the docs` (white outline)

### Footer

- 5 columns:
  - **Product** — Features · Themes · Add-ons · Compare
  - **Use cases** — Developers · Streamers · Creators · Sysadmins
  - **Resources** — Docs · Guides · Changelog · GitHub
  - **Community** — Discord · Issues · Discussions
  - **Legal** — License · Privacy · Trademarks
- Bottom bar: full logo lockup (`logoFull.png`, white-on-slate) on the left, copyright `© 2026 Sireno Deck — MIT` in the center, and two small compliance tags on the right: `MIT licensed` and `Linux-first`
- Tiny red fin mark watermark in the bottom-right corner

---

## Section 4 — Docs pages (Stitch shells)

Each docs page shares the same nav and footer. The body is a single `<article>` with:

- Page title (H1)
- One-paragraph intro
- 3–6 section headings (H2) with prose
- A "Back to home" link at the bottom

For the Stitch export, mark each docs page as a separate route with the same layout. The **content** of the docs is the secondary deliverable — the layout is what matters now.

---

## Section 5 — Image map (the captures)

These are real screenshots of the running Sireno Deck emulator. Embed them with descriptive alt text. Place them in `plans/design/captures/` of the project repo.

| File                                                   | Use in                                       | Notes                                                                                                                                              |
| ------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cli/docs/screenshots/emulator-main-deck.png` | Hero (right side)                            | The canonical hero — the user's actual main deck with live system stats, weather, time, emojis, music, overlay toggle. Use this for Stitch import. |
| `02-media-controls.png`                                | `#features` (Built-in types card)            | Media player, volume up/down, mute buttons in multiple colors                                                                                      |
| `05-date-time.png`                                     | `#features` (Built-in types card)            | 12 date/time variants — big clock, analog, date, custom format                                                                                     |
| `06-weather.png`                                       | `#features` (Built-in types card)            | Weather tiles for multiple cities (offline rendering shows "--")                                                                                   |
| `07-action-buttons.png`                                | `#features` (Built-in types, Macros section) | Action buttons in all variants + colors                                                                                                            |
| `08-value-display.png`                                 | `#addons` tile                               | Value display showing CPU/RAM/uptime                                                                                                               |
| `09-app-shortcuts-grid.png`                            | `#addons` tile                               | App shortcuts deck (VS Code, Chrome, Slack, etc.)                                                                                                  |
| `10-app-overlays.png`                                  | `#overlay` section + `#addons`               | App overlays menu (the "VS Code / Chrome / Slack / OpenCode / Discord / Teams / Meet" entry points)                                                |
| `11-pomodoro.png`                                      | `#addons` tile                               | Three pomodoro timer tiles                                                                                                                         |
| `13-theme-light.png`                                   | `#themes` (light card)                       | Light theme demo-decks-index (theme may not apply on capture — see NOTES)                                                                          |
| `14-theme-riptide.png`                                 | `#themes` (third-party example card)         | The user's main deck in `riptide` synthwave theme — vivid pink/yellow on dark                                                                      |
| `15-settings-deck.png`                                 | `/docs/builtin-addons` (internal-settings)   | Settings deck (About, Brightness, Theme manager)                                                                                                   |

Images must be:

- Cropped to the 5×3 deck frame only (no emulator chrome, no bare browser viewport)
- Displayed at the device's native pixel ratio (Stream Deck MK.2 LCD is 96px per key)
- Set with a 1px border in `--sireno-frame` so the deck frame is visible on the dark page

---

## Section 6 — Interaction & micro-animation notes

- Hero CTA hovers: scale 1.02, 200ms ease-out, soft glow shadow `0 0 24px rgba(125,211,252,0.35)`.
- Theme showcase cards: on hover, the deck mockup tilts 2° toward the viewer (perspective transform), 250ms ease-out.
- "How it works" step numeric badges: appear with a 200ms translate-into-place from below, staggered 80ms.
- Stat row numbers: count up from 0 to the target value on first viewport entry (200ms duration).
- Feature cards: shadow lifts on hover (`0 8px 24px rgba(0,0,0,0.45)`).
- CTA banner: subtle gradient sweep on hover (background-position shifts left 100% over 800ms).
- Sticky nav: subtle backdrop blur after the user scrolls past 80px (`backdrop-filter: blur(8px)`).

---

## Section 7 — Implementation checklist

Exhaustive list of what to produce, in order:

1. Brand color tokens (CSS custom properties) — copy from Section 0.
2. Typography scale (use a serif body + sans-serif UI, or Inter alone if the tool restricts).
3. Sticky nav component.
4. Hero section with mockup image positioned right.
5. Stat row (4 columns).
6. "How it works" (4 numbered steps).
7. Features grid (3×2 = 6 cards).
8. Theme showcase (2-column compare).
9. Add-ons grid (8 tiles, 3 columns).
10. Contextual overlay section (annotated screenshot).
11. Keyboard macros section (code block + deck mockup).
12. Comparison table (10 rows).
13. CTA banner (full-bleed gradient).
14. Footer (5 columns + bottom bar).
15. Docs shells (7 pages, same layout, placeholder content).
16. Responsive behavior: nav collapses to hamburger below 768px; hero stacks vertically; grids collapse to 1 column; tables become card stacks.
17. Dark mode: the entire site is dark by default (matches the brand); no light mode toggle.
18. Accessibility: contrast ratios ≥ 4.5:1 for body text, 3:1 for large text; `aria-label` on the nav brand; `alt` text on every image; visible focus states on all interactive elements.

---

## Section 8 — Quality bar

- **Visually**: stunning. The hero must feel like a product launch — wide, confident, with the deck mockup anchored in the right half. The chevron-scale watermark should be visible but never distracting.
- **Informationally**: every claim in the copy is verifiable against Sireno Deck's actual behavior (no aspirational copy).
- **Technically**: the exported HTML/CSS/JS must be production-ready — no placeholder lorem ipsum, no `<!-- TODO -->` comments, no `{variable}` substitution leftovers.
- **Tone**: confident, plain English, no emojis, no exclamation marks except in explicit CTAs. Reading like a senior dev wrote it for a peer.

---

## Section 9 — Reference: how the daemon works (for context only, not for the UI)

If the AI tool asks for technical accuracy, here's the 30-second summary:

Sireno Deck is a Node CLI that drives an Elgato Stream Deck from a YAML config. The runtime is a local daemon; the frontend is a Vite-built React 19 + Tailwind 4 SPA that renders the active deck. The daemon publishes a WebSocket protocol on `127.0.0.1:52937`; the frontend embeds in a browser emulator at `127.0.0.1:52938`. Eight addons ship built-in: date-time, weather, system-status, media, emoji-selector, value-display, brightness, session. Themes are YAML + CSS assets. There is an npm-published addon API for third-party button types and decks. The project is licensed MIT, runs on Linux/macOS/Windows, and is the official first-class Stream Deck manager for Linux.

---

## Section 10 — Output

Deliver one of:

- A Stitch design file (if Stitch is the target), or
- A single self-contained `index.html` (or `index.html` + `style.css` + `script.js`) with all 12 landing sections + 7 docs shells, fully responsive, dark by default, using the brand tokens above.

If the tool is Stitch, use the captures in Section 5 as the imagery and the copy in Section 3 verbatim. Do not invent new copy. If something is unclear, prefer the canonical hero image and the verbatim copy over invention.

---

**End of prompt.**
