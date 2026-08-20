# Sireno Deck — Stitch Website Plan

- **Folder:** `plans/design/`
- **Reference style:** gladia.io — dark hero, sticky nav, big stats, numbered "How it works", alternating feature deep-dives, comparison table, CTA banner, dense footer.
- **Audience:** regular users (not developers). Marketing-oriented landing copy. Code/types/protocols live in `/docs`.
- **Tooling:** Google Stitch for the visual design + responsive web export.

## Decisions (locked)

- **Captures:** 12 final PNGs (15 originally planned, 01-hero dropped after WS-handshake races broke the iframe renderer).
- **Theme claim:** "2 built-in + 3rd-party"
- **Overlay demo:** real emulator capture
- **Docs:** Stitch-mirrored pages

## Deliverables checklist

- [x] `plans/design/PLAN.md` — this document
- [x] `plans/design/copy.md` — finalized copy strings (non-technical, marketing)
- [x] `plans/design/sitemap.md` — IA + URL list
- [x] `plans/design/captures/02..15.png` — the captures (12 final)
- [x] `plans/design/captures/capture.sh` — original capture script (legacy)
- [x] `plans/design/captures/capture-one.sh` — capture script template
- [x] `plans/design/captures/capture-deck.sh` — running-daemon capture helper
- [x] `plans/design/captures/capture-all.sh` — batch runner
- [x] `plans/design/captures/recapture.sh` — recapture with theme overrides (requires setsid)
- [x] `plans/design/captures/_write_wrapper.py` — Python helper for theme wrappers

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
2. Hero — headline + subhead + 2 CTAs + deck mockup (dropped — see NOTES)
3. Stat row
4. How it works — 4 numbered steps
5. Features grid — 3×2 of the 6 highlighted cards
6. Theme showcase — default vs light side-by-side
7. Addon ecosystem — 3-col tile grid (8 addons)
8. Contextual overlay — annotated OpenCode overlay capture
9. Keyboard macros — code block + deck mockup
10. Comparison table — Sireno vs Elg vs vs Loupedeck (10 rows)
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

## Capture list (12 final)

Folder: `plans/design/captures/`

| #   | File                   | Source / demo                                              | Status                      |
| --- | ---------------------- | ---------------------------------------------------------- | --------------------------- |
| 01  | ~~hero-main-deck.png~~ | user's main deck (rich content)                            | dropped (see NOTES)         |
| 02  | media-controls.png     | demos/demo-media.yml                                       | OK                          |
| 03  | ~~system-metrics.png~~ | demos/demo-system-status.yml                               | dropped                     |
| 04  | ~~emojis.png~~         | demos/demo-emoji-selector.yml                              | dropped                     |
| 05  | date-time.png          | demos/demo-date-time.yml                                   | OK                          |
| 06  | weather.png            | demos/demo-weather.yml + extra wait                        | OK                          |
| 07  | action-buttons.png     | demos/demo-core.yml                                        | OK                          |
| 08  | value-display.png      | demos/demo-value-display.yml                               | OK                          |
| 09  | app-shortcuts-grid.png | demos/demo-app-shortcuts.yml (with app-shortcuts addon)    | OK                          |
| 10  | app-overlays.png       | demos/demo-app-overlays.yml (with app-shortcuts addon)     | OK                          |
| 11  | pomodoro.png           | demos/demo-pomodoro.yml (with pomodoro addon)              | OK                          |
| 12  | ~~theme-default.png~~  | dropped — `13-theme-light` and `14-theme-riptide` cover it | dropped                     |
| 13  | theme-light.png        | demos/demo-decks-index.yml, theme=light                    | partial (theme not applied) |
| 14  | theme-riptide.png      | user's main deck, theme=riptide (synthwave)                | OK                          |
| 15  | settings-deck.png      | internal-settings:settings deck                            | OK                          |

## Comparison table (locked)

| Feature                        | Sireno Deck                         | Elgato Stream Deck SW | Loupedeck          |
| ------------------------------ | ----------------------------------- | --------------------- | ------------------ |
| Works on Linux                 | Yes, first-class                    | No                    | No                 |
| Configure in plain text        | Yes                                 | Click-only            | Click-only         |
| Track changes in git           | Yes                                 | No                    | No                 |
| Themes (fonts, colors, layout) | Two built-in, plus install your own | A few skins           | Profiles only      |
| Add new button types           | Anyone can publish one, like an app | Closed marketplace    | Closed             |
| Buttons change by app          | Yes — automatically                 | Manual profiles       | Manual profiles    |
| Tap / double-tap / hold        | All three, per button               | Tap and hold          | Tap and hold       |
| Type emoji and special chars   | Yes                                 | No                    | No                 |
| Try without the device         | Yes — full browser preview          | No                    | No                 |
| Price                          | Free                                | Free (with device)    | Free (with device) |

## Docs pages — content scaffold

| Page                  | Sections                                                                                                            | Source                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| /docs landing         | 6-chapter card grid                                                                                                 | new copy                                                                             |
| /docs/getting-started | Install · First run · --emulator · CLI cheatsheet · Next steps                                                      | packages/cli/docs/user/installation.mdx + running-the-service.mdx                    |
| /docs/configuration   | decks: · Button anatomy · Gestures · Triggers · Variants · Pointer to /docs/themes                                  | packages/cli/docs/user/configuration-files.mdx + decks-and-buttons.mdx + actions.mdx |
| /docs/builtin-addons  | One anchor per addon (date-time, weather, system-status, media, emoji-selector, value-display, brightness, session) | packages/cli/src/builtin-addons/*/README.md                                          |
| /docs/themes          | Tokens reference · Built-in (default, light) · Sibling / npm themes · Authoring pointer                             | packages/cli/docs/user/themes.mdx + developer/theme-authoring.mdx                    |
| /docs/addon-authoring | Manifest · Button types · Decks (static + dynamic) · Global backend · Store · Publishing · Building                 | packages/cli/docs/developer/addon-authoring.mdx                                      |
| /docs/keyboard-macros | macro:// · type:// · delay() · Host placeholders · brightness://                                                    | packages/cli/docs/user/actions.mdx + reference/macro-syntax.mdx                      |
| /docs/protocol        | Reference tables (lifted verbatim)                                                                                  | ARCHITECTURE.md §3.10                                                                |

## NOTES — capture pipeline quirks (read this before re-running captures)

- **CLI `--port` is not honored by the daemon.** The WS bridge hardcodes `52937` in `cli/commands/run.ts:1387`, and the emulator HTTP port hardcodes `52938` (`packages/cli/src/render/emulator-server.ts`). Use the standard ports.
- **The daemon caches the config path** in `$XDG_RUNTIME_DIR/sireno-deck.config` and prefers it over `--config` on subsequent starts. To force a new config, `rm /run/user/1000/sireno-deck*` before `start`.
- **Bash tool kills detached background processes** when the foreground command returns — that's why `start &` from a bash command dies after ~30s. Wrap long-running daemons with `setsid -f node ...` so they detach from the foreground process group.
- **`!include` paths must stay inside `dirname(config)`** (path-traversal check in `packages/cli/src/config/include-resolver.ts`). For wrappers, place them next to the included files (e.g. `/works/opensource/sireno-deck/demos/.tmp-*.yml`) or in the user's config dir.
- **The theme `activeTheme` is never populated on the WS bridge** (the option exists in `ws-bridge.ts` but no caller sets it). Result: `hello-ack` always reports `config: {}`, the frontend doesn't get a theme name from the bridge, and CSS that depends on `activeTheme` (rendered via virtual modules) never switches even when `theme: light` is set in config. **Workaround for theme captures:** use the `riptide` sibling theme (CSS bundled statically) instead of `light`, which gets emitted correctly via vite. This is why `14-theme-riptide.png` works but `13-theme-light.png` shows the default dark style.
- **WS handshake timeouts dominate the logs** when the iframe is opened in a fresh tab. The daemon's `HANDSHAKE_TIMEOUT_MS = 5000` (line 16) closes connections that haven't sent hello within 5s — and vite-served frontends in `--emulator` mode sometimes take longer to mount + initialize the WS client. The daemon survives (no fatal exit on handshake timeout), but the affected client never gets a `deck-config` and shows the empty deck frame.
- **`core:lock` always shows up as the active deck in hello-ack**, even when the user's config defines `main` (or `demo-decks-index`). The session addon registers `core:lock` as the initial deck; user decks appear in `deck-tree.decks` and are reachable via WS `select-deck` — but **select-deck is not implemented in `packages/cli/src/outputClient/emulator.ts`** (only `button-action` and `set-device` are). So URL hash navigation (`/#/demo-decks-index`) is ignored, and there's no programmatic way to switch from the emulator side.
- **`select-deck` IS in the protocol schema** (`packages/cli/src/api/protocol-internal.ts:147`) but unused by the runtime — that's why the hero capture with `theme: default` + `main` deck (which worked in earlier batches) intermittently fails: the user's first browser tab loads before vite has compiled the iframe bundle, and the WS client inside the iframe never sends hello.

### Practical recipe (one daemon = one capture)

```bash
# 1. Kill any stragglers
for pid in $(lsof -iTCP:52938,52937,5180 -sTCP:LISTEN -t 2>/dev/null) ; do
  kill -9 "$pid" 2>/dev/null
done
rm -f /run/user/1000/sireno-deck* /works/opensource/sireno-deck/demos/.tmp-stitch-*.yml

# 2. Write the wrapper (next to the demo file for path-traversal safety)
cat > /works/opensource/sireno-deck/demos/.tmp-capture.yml <<'YAML'
decks:
  demo-decks-index: !include demo-decks-index.yml
YAML

# 3. Detach so bash tool's foreground return doesn't kill the daemon
setsid -f node /works/opensource/sireno-deck/packages/cli/bin/sirenodeck.js start \
  --config /works/opensource/sireno-deck/demos/.tmp-capture.yml --emulator \
  > /tmp/sd.log 2>&1 < /dev/null

# 4. Wait for the daemon + vite children to settle (~25s)
sleep 25
ss -ltn | grep -E ':52937|:52938|:5180'  # all three must be LISTEN

# 5. Capture (browser open + screenshot)
agent-browser open "http://127.0.0.1:52938/?deckOnly=1"
sleep 12
agent-browser eval "..."  # inject CSS to hide fullscreen-toggle
agent-browser screenshot /path/to/capture.png

# 6. Cleanup
kill -9 $(lsof -iTCP:52938 -sTCP:LISTEN -t) $(lsof -iTCP:52937 -sTCP:LISTEN -t) ...
rm -f /works/opensource/sireno-deck/demos/.tmp-capture.yml
```

### What did work for the 12 final captures

| Capture                     | What worked                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02-media-controls.png`     | `capture-one.sh` with `demos/demo-media.yml`, fresh daemon, 8s wait                                                                               |
| `05-date-time.png`          | `capture-one.sh` with `demos/demo-date-time.yml`, fresh daemon, 8s wait                                                                           |
| `06-weather.png`            | `capture-one.sh` with `demos/demo-weather.yml`, fresh daemon, 18s wait (weather API has 600_000 ms poll interval; first poll needs more time)     |
| `07-action-buttons.png`     | `capture-one.sh` with `demos/demo-core.yml`, fresh daemon, 8s wait                                                                                |
| `08-value-display.png`      | `capture-one.sh` with `demos/demo-value-display.yml`, fresh daemon, 8s wait                                                                       |
| `09-app-shortcuts-grid.png` | `capture-one.sh` with `demos/demo-app-shortcuts.yml` + pomodoro/app-shortcuts addons, fresh daemon, 8s wait                                       |
| `10-app-overlays.png`       | `capture-one.sh` with `demos/demo-app-overlays.yml` + same addons, fresh daemon, 8s wait                                                          |
| `11-pomodoro.png`           | `capture-one.sh` with `demos/demo-pomodoro.yml` + pomodoro addon, fresh daemon, 8s wait                                                           |
| `14-theme-riptide.png`      | wrapper `demos/.tmp-stitch-riptide.yml` (`theme: riptide`) with user's config; the riptide theme is emitted statically via vite so it does render |
| `15-settings-deck.png`      | `capture-one.sh` with `demos/demo-decks-index.yml`, deck=`internal-settings:settings`, fresh daemon, 8s wait                                      |

### What broke (do NOT redo without debugging the WS handshake first)

- `01-hero-main-deck.png` — every recapture attempt left the user's main deck with only 2 date-time tiles visible (WS bridge not delivering `deck-config` to the iframe). The original canonical image lives at `packages/cli/docs/screenshots/emulator-main-deck.png` and was used as a fallback.
- `13-theme-light.png` — light theme doesn't apply through the daemon's WS bridge (activeTheme never set, see NOTES).
- The theme `neon-grids` exists at `packages/themes/neon-grids/` but I used `riptide` instead because riptide is the bundled sibling theme that works; switching to neon-grids would hit the same theme-CSS-injection issue as light.
