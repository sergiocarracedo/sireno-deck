# Sitemap — Sireno Deck website

## Pages (Stitch URLs)

| URL                           | Purpose                                  | Anchor sections                                                                  |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `/`                           | Marketing landing                        | hero · stats · features · how · themes · addons · overlay · macros · compare · cta |
| `/docs`                       | Docs landing                             | 6 chapter cards                                                                  |
| `/docs/getting-started`       | Install + first run + CLI cheatsheet     | prereqs · install · first run · emulator · CLI · next                             |
| `/docs/configuration`         | config.yml anatomy                       | decks · buttons · gestures · triggers · variants                                  |
| `/docs/builtin-addons`        | Per-addon reference                      | one anchor per addon                                                              |
| `/docs/themes`                | Theme tokens, built-ins, 3rd-party       | tokens · built-in · sibling · npm · authoring pointer                             |
| `/docs/addon-authoring`       | Manifest API + publishing                | manifest · types · decks · backend · store · publish                              |
| `/docs/keyboard-macros`       | macro:// / type:// / host placeholders   | syntax · examples · gestures                                                      |
| `/docs/protocol`              | WS bridge reference                      | handshake · messages · shapes                                                     |

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

## Image map (final, 12 captures + 1 canonical hero)

| Image                          | Used in                          | Source                                                       |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------ |
| `01-hero-main-deck.png`        | `#hero`, `#themes` (default)        | canonical `packages/cli/docs/screenshots/emulator-main-deck.png` |
| `02-media-controls.png`        | `#features` (Built-in types)        | captures/demo-media                                          |
| `05-date-time.png`             | `#features` (Built-in types)        | captures/demo-date-time                                     |
| `06-weather.png`               | `#features` (Built-in types), `#addons` | captures/demo-weather                                       |
| `07-action-buttons.png`        | `#features` (Built-in types), `#macros` | captures/demo-core                                          |
| `08-value-display.png`         | `#addons`                            | captures/demo-value-display                                 |
| `09-app-shortcuts-grid.png`    | `#addons`                            | captures/demo-app-shortcuts (with app-shortcuts addon)       |
| `10-app-overlays.png`          | `#overlay`, `#addons`                | captures/demo-app-overlays (with app-shortcuts addon)         |
| `11-pomodoro.png`              | `#addons`                            | captures/demo-pomodoro (with pomodoro addon)                  |
| `13-theme-light.png`           | `#themes` (light)                    | captures/demo-decks-index, theme=light                       |
| `14-theme-riptide.png`          | `#themes` (third-party example)      | captures/demo-decks-index, theme=riptide                     |
| `15-settings-deck.png`          | `/docs/builtin-addons` (internal-settings) | captures/demo-decks-index, deck=internal-settings:settings  |