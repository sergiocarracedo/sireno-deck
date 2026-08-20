# Sitemap — Sireno Deck website

## Pages (Stitch URLs)

| URL                     | Purpose                                | Anchor sections                                                                    |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `/`                     | Marketing landing                      | hero · stats · features · how · themes · addons · overlay · macros · compare · cta |
| `/docs`                 | Docs landing                           | 6 chapter cards                                                                    |
| `/docs/getting-started` | Install + first run + CLI cheatsheet   | prereqs · install · first run · emulator · CLI · next                              |
| `/docs/configuration`   | config.yml anatomy                     | decks · buttons · gestures · triggers · variants                                   |
| `/docs/builtin-addons`  | Per-addon reference                    | one anchor per addon                                                               |
| `/docs/themes`          | Theme tokens, built-ins, 3rd-party     | tokens · built-in · sibling · npm · authoring pointer                              |
| `/docs/addon-authoring` | Manifest API + publishing              | manifest · types · decks · backend · store · publish                               |
| `/docs/keyboard-macros` | macro:// / type:// / host placeholders | syntax · examples · gestures                                                       |
| `/docs/protocol`        | WS bridge reference                    | handshake · messages · shapes                                                      |

## Section anchors (landing)

- `#hero`
- `#stats`
- `#features`
- `#how`
- `#themes`
- `#addons`
- `#overlay`
- `#macros`
- `#compare`
- `#cta`

## Top nav (sticky)

Logo · Product · Themes · Addons · Docs · GitHub · **Get started**

## Footer columns

- Product · Use cases · Resources · Community · Legal

## Image map (12 captures — hero dropped, see PLAN.md §NOTES)

The hero image (01-hero-main-deck.png) was lost during recapture. The canonical
hero is `packages/cli/docs/screenshots/emulator-main-deck.png` — that file
exists in the repo and shows the full main deck (system stats, weather, time,
date, emojis launcher, music, overlay toggle) and should be used for Stitch
import instead.

| Image                       | Used in                                    |
| --------------------------- | ------------------------------------------ |
| `02-media-controls.png`     | `#features` (Built-in types)               |
| `05-date-time.png`          | `#features` (Built-in types)               |
| `06-weather.png`            | `#features` (Built-in types)               |
| `07-action-buttons.png`     | `#features` (Built-in types)               |
| `08-value-display.png`      | `#addons`                                  |
| `09-app-shortcuts-grid.png` | `#addons`                                  |
| `10-app-overlays.png`       | `#overlay`, `#addons`                      |
| `11-pomodoro.png`           | `#addons`                                  |
| `13-theme-light.png`        | `#themes` (light)                          |
| `14-theme-riptide.png`      | `#themes` (third-party example)            |
| `15-settings-deck.png`      | `/docs/builtin-addons` (internal-settings) |
