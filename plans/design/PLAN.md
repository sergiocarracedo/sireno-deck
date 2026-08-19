# Sireno Deck — Stitch Website Plan

- **Folder:** `plans/design/`
- **Reference style:** gladia.io — dark hero, sticky nav, big stats, numbered "How it works", alternating feature deep-dives, comparison table, CTA banner, dense footer.
- **Audience:** regular users (not developers). Marketing-oriented landing copy. Code/types/protocols live in `/docs`.
- **Tooling:** Google Stitch for the visual design + responsive web export.

## Decisions (locked)

- **Captures:** 15 PNGs total. **12 captured successfully** (03-system-metrics, 04-emojis, 12-theme-default reused the canonical `packages/cli/docs/screenshots/emulator-main-deck.png` as 01-hero-main-deck.png).
- **Theme claim:** "2 built-in + 3rd-party"
- **Overlay demo:** real emulator capture
- **Docs:** Stitch-mirrored pages

## Deliverables checklist

- [x] `plans/design/PLAN.md` — this document
- [x] `plans/design/copy.md` — finalized copy strings (non-technical, marketing)
- [x] `plans/design/sitemap.md` — IA + URL list
- [x] `plans/design/captures/01..15.png` — the 15 captures (12 original + 1 canonical hero + 2 dropped)
- [x] `plans/design/captures/capture-one.sh` — capture script template
- [x] `plans/design/captures/capture-deck.sh` — running-daemon capture helper
- [ ] `plans/design/captures/capture-all.sh` — batch runner (script written; full run blocked by daemon WS-handshake races — see NOTES)
- [ ] `plans/design/stitch-export/` — Stitch export once generated

## Site map

```
/                          Landing
/docs                       Docs landing
/docs/getting-started       Install + first run
/docs/configuration         config.yml anatomy
/docs/builtin-addons        Per-addon reference
/docs/themes                Tokens + built-in + 3rd-party
/docs/addon-authoring       Manifest API + publishing
/docs/keyboard-macros       macro:// / type:// / host placeholders
/docs/protocol              WS bridge reference table
```

## Landing sections (Gladia parity)

1. Sticky nav
2. Hero — headline + subhead + 2 CTAs + deck mockup (`01-hero-main-deck.png`)
3. Stat row
4. How it works — 4 numbered steps
5. Features grid — 3×2 of the 6 highlighted cards
6. Theme showcase — default vs light side-by-side (`13-theme-light.png`)
7. Addon ecosystem — 3-col tile grid (8 addons, using `05/06/07/09/10/11`)
8. Contextual overlay — annotated OpenCode overlay capture (`10-app-overlays.png`)
9. Keyboard macros — code block + deck mockup (`07-action-buttons.png`)
10. Comparison table — Sireno vs Elgato vs Loupedeck (10 rows)
11. CTA banner
12. Footer — 5-col + bottom bar

## The six featured cards (titles)

1. Built-in button types
2. Linear navigation
3. Themable — 2 built-in + yours
4. Extend it without forking
5. Decks that know what you're doing
6. Buttons that do things on your computer

## How it works (4 steps, plain English)

1. Describe your deck
2. Press start
3. Tap a button
4. It keeps updating

## Capture list (12 final + 1 canonical hero)

Folder: `plans/design/captures/`

| #   | File                     | Source                                                        |
| --- | ------------------------ | ------------------------------------------------------------- |
| 01  | hero-main-deck.png         | canonical `packages/cli/docs/screenshots/emulator-main-deck.png` |
| 02  | media-controls.png         | demos/demo-media.yml (captured)                                |
| 03  | ~~system-metrics.png~~     | dropped — replaced visually by `05-date-time` + `06-weather`   |
| 04  | ~~emojis.png~~             | dropped — `09-app-shortcuts-grid` covers addon density          |
| 05  | date-time.png              | demos/demo-date-time.yml (captured)                            |
| 06  | weather.png                | demos/demo-weather.yml (captured, offline = "--")               |
| 07  | action-buttons.png         | demos/demo-core.yml (captured)                                  |
| 08  | value-display.png          | demos/demo-value-display.yml (captured)                         |
| 09  | app-shortcuts-grid.png     | demos/demo-app-shortcuts.yml (captured, with app-shortcuts addon) |
| 10  | app-overlays.png           | demos/demo-app-overlays.yml (captured, with app-shortcuts addon) |
| 11  | pomodoro.png               | demos/demo-pomodoro.yml (captured, with pomodoro addon)        |
| 12  | ~~theme-default.png~~      | dropped — `13-theme-light` and `14-theme-riptide` cover it       |
| 13  | theme-light.png            | demos/demo-decks-index.yml, theme=light (captured)               |
| 14  | theme-riptide.png          | demos/demo-decks-index.yml, theme=riptide (captured, with Bitcount font + neon tile) |
| 15  | settings-deck.png          | demos/demo-decks-index.yml (captured, internal-settings:settings) |

## Comparison table (locked)

| Feature                        | Sireno Deck                              | Elgato Stream Deck SW     | Loupedeck          |
| ------------------------------ | ---------------------------------------- | ------------------------- | ------------------ |
| Works on Linux                 | Yes, first-class                         | No                        | No                 |
| Configure in plain text        | Yes                                      | Click-only                | Click-only         |
| Track changes in git           | Yes                                      | No                        | No                 |
| Themes (fonts, colors, layout) | Two built-in, plus install your own      | A few skins               | Profiles only      |
| Add new button types           | Anyone can publish one, like an app      | Closed marketplace        | Closed             |
| Buttons change by app          | Yes — automatically                      | Manual profiles           | Manual profiles    |
| Tap / double-tap / hold        | All three, per button                    | Tap and hold              | Tap and hold       |
| Type emoji and special chars   | Yes                                      | No                        | No                 |
| Try without the device         | Yes — full browser preview               | No                        | No                 |
| Price                          | Free                                     | Free (with device)        | Free (with device) |

## Docs pages — content scaffold

| Page                   | Sections                                                                                                              | Source                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| /docs landing          | 6-chapter card grid                                                                                                   | new copy                                                                                                |
| /docs/getting-started  | Install · First run · --emulator · CLI cheatsheet · Next steps                                                         | packages/cli/docs/user/installation.mdx + running-the-service.mdx                                        |
| /docs/configuration    | decks: · Button anatomy · Gestures · Triggers · Variants · Pointer to /docs/themes                                    | packages/cli/docs/user/configuration-files.mdx + decks-and-buttons.mdx + actions.mdx                     |
| /docs/builtin-addons   | One anchor per addon (date-time, weather, system-status, media, emoji-selector, value-display, brightness, session)   | packages/cli/src/builtin-addons/*/README.md                                                              |
| /docs/themes           | Tokens reference · Built-in (default, light) · Sibling / npm themes · Authoring pointer                               | packages/cli/docs/user/themes.mdx + developer/theme-authoring.mdx                                        |
| /docs/addon-authoring  | Manifest · Button types · Decks (static + dynamic) · Global backend · Store · Publishing · Building                   | packages/cli/docs/developer/addon-authoring.mdx                                                         |
| /docs/keyboard-macros  | macro:// · type:// · delay() · Host placeholders · brightness://                                                     | packages/cli/docs/user/actions.mdx + reference/macro-syntax.mdx                                          |
| /docs/protocol         | Reference tables (lifted verbatim)                                                                                    | ARCHITECTURE.md §3.10                                                                                    |

## NOTES — capture pipeline quirks

- The CLI's `--port` flag is **partially honored** by `start.ts` (sets runtime flags), but the actual WS bridge hardcodes `52937` in `cli/commands/run.ts:1387`. The HTTP emulator port also hardcodes `52938` (no flag override).
- The emulator's URL hash (`#/deckId`) does **not** navigate the deck — only the WS bridge `deck-config` message does.
- `core:change-deck` buttons need their target deck to exist for the bridge to render the button frame; standalone yml files (like `demo-decks-index.yml`) only have change-deck buttons, and the runtime's behavior here is sensitive to vite build state. Re-capturing via fresh daemons sometimes returns blank tiles. The canonical hero image (`packages/cli/docs/screenshots/emulator-main-deck.png`) was generated by `demos/capture-deck-video.sh` with the user's full config — that's the most reliable rendering.
- The "FULL" floating button on `?deckOnly=1` is hidden via injected CSS (`[data-testid='fullscreen-toggle'] { display: none !important }`).
- Path traversal: `!include` paths must stay inside `dirname(config)`. The wrapper config is staged next to the demo yml in `demos/`.
- WS handshake: the daemon expects `hello` (with token) BEFORE accepting other messages. `select-deck` is defined in the protocol schema but the emulator backend does not dispatch it — only `button-action` triggers runtime navigation.