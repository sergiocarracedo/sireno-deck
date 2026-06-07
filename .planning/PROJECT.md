# Sireno Deck

## What This Is

Sireno Deck is a TypeScript CLI for controlling and managing Stream Deck devices through a YAML-defined system of buttons, decks, themes, and addons. It targets Linux, macOS, and Windows users who own compatible hardware and want a programmable, extensible alternative to existing Stream Deck tools, with Linux support as the minimum bar for v1.

## Core Value

Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.

## Current Milestone: v1.5 — Addons & UX Polish II

**Goal:** Close the most visible UX gaps in the current addon surface and ship a richer settings + active-app overlay model, pivoting away from the deferred distribution build pipeline (Phases 40/47/48 from v1.4). Distribution work remains on the deferred list pending a distribution-target decision.

**Target features:**
- Weather: location by city name (Open-Meteo Geocoding) + 2-day daily forecast page
- Bars content polish: primary-color labels, in-bar rotated value text, auto-contrast fallback
- Settings deck: brightness up/down controls, logo + version relocated from main deck
- Lock deck: pre-warm access from unlocked sessions, no back injection when locked
- Active-app addon decks: declarative `process_names` overlay, toggle button, double-tap back

## Latest Shipped Milestone: v1.4 Addons & UX Polish

**Completed:** 2026-06-07
**Phases:** 7 (41-46, 49)
**Requirements delivered:** BD-03, BD-05, SRB-01 through SRB-05, CAL-01 through CAL-03, MV-01 through MV-07, WX-01 through WX-06, EMO-01 through EMO-14 (35 total)

**Key achievements:**
- First-run Chromium auto-install via Playwright
- System-reserved back button in subdecks (tap → previous, hold → home)
- Calendar date-time button (vertical month/day/weekday layout)
- Media-volume buttons (mute toggle, volume up/down, real OS state)
- Weather addon (Open-Meteo primary, wttr.in fallback, configurable location)
- Emoji-selector revamp: real emoji rendering via native font stack, 11-category hand-curated catalog (383 emojis), paginated subdecks with noHistory page-to-page navigation, emoji-launcher 2×3 grid button, addon-decorated system back

**Goal:** Expand the render/runtime surface so addons and built-in buttons can react to richer session state, compose shared visual primitives, and handle background and lock-screen behavior coherently.

**Target features:**
- Layered background support with config, deck, and theme fallback precedence
- OS/session context injection into render, execution, and config templating
- Multiple text fitting modes with shrink-to-fit as the default and wrap support
- Globally reusable addon-provided wrappers and styles
- Richer built-in toggle buttons for internal and command-driven state models
- Lock-screen awareness with a dedicated locked-session deck and clean unlock restore behavior

## Requirements

### Validated

- Background precedence, text fitting, wrapper/style primitives, richer built-in toggles, lock-deck substitution/restore behavior, browser-rendered theme/font delivery, mounted addon rendering, TSX-first built-ins, and emulator/browser verification all shipped across the v1.2 line and its follow-on hardening phases.
- [x] Ship a v1 CLI in TypeScript that can detect and control devices supported by `node-elgato-stream-deck`, with Linux as the minimum supported OS and a path to macOS and Windows support.
- [x] Support a YAML-based `config.yml` that defines global settings, themes, the main deck, additional decks, button placement, and per-button configuration edited by users by hand.
- [x] Implement core button and deck concepts: main deck, nested decks with back navigation, button types, and button instances.
- [x] Provide built-in button types for change-deck, display-only, action, and toggle behaviors.
- [x] Provide built-in live data buttons for CPU usage, memory usage, fan speed, emoji selector, audio control, and media control.
- [x] Support periodic status and display updates for buttons, with default polling around 500ms and user-configurable intervals.
- [x] Use a React-based rendering model so built-in buttons and addons can render images or visual output through components.
- [x] Support trusted in-process addons written in TypeScript, installable from local folders and npm packages.
- [x] Let addons provide button types, button instances, deck types, deck instances, manifests, bundled decks, and reusable assets such as icons.
- [x] Provide a YAML-based theme system for global visual tokens such as background, accent, and primary colors, plus a small set of built-in themes.
- [x] Support layered background composition with config-level override, deck fallback, and theme fallback.
- [x] Expose OS type, variant, and version to addons and built-in surfaces during render, command/status execution, and config templating.
- [x] Support multiple text fitting modes, with shrink-to-fit until a readable minimum size then clip as the default behavior, plus wrap mode.
- [x] Let addons register globally reusable button wrappers and style primitives.
- [x] Provide richer built-in toggle buttons covering internal state and command-driven state models.
- [x] Detect session lock/unlock state, switch to a dedicated locked-session deck while locked, and restore prior state on unlock.

### Active

v1.5 — Addons & UX Polish II (25 requirements, see `.planning/REQUIREMENTS.md`):
- WX-07..10 — Weather city-name + geocoding
- WX2-01..03 — Weather 2-day daily forecast
- BARS-01..03 — Bars content polish
- SETTINGS-01..04 — Settings deck with brightness controls
- LOCK-01..02 — Lock deck access and back-injection suppression
- BR-01..02 — Brightness device control
- ACTIVEAPP-01..06 — Addon active-app overlay decks
- VERIFY-01 — Verification coverage

### Out of Scope

- Desktop UI app in v1 — the first release is CLI-only to keep scope small and get hardware integration, config, rendering, and addons working first.
- Sandboxed or isolated addon execution in v1 — addons are trusted and run in-process so the extension API can stabilize before adding isolation complexity.
- GUI-based config editing in v1 — users will edit `config.yml` by hand rather than through a visual editor.

## Context

The product is a Stream Deck management tool for users on Linux, macOS, and Windows who want deeper customization than existing tools provide, especially on Linux. The initial release is intentionally CLI-first and focused on hardware support, live button rendering, deck navigation, and an addon model that external developers can use immediately.

The project uses TypeScript throughout. Addons are also TypeScript-based and may be installed locally or from npm. Rendering should be component-driven using React so buttons can produce images or other visual output efficiently. Configuration and theming should be plain YAML so users can inspect and modify everything directly.

The domain includes fast refresh behavior for live widgets such as CPU, memory, fan speed, media state, and command-driven buttons. Some buttons may derive their displayed state from external commands instead of internal application state, so the architecture needs clean polling, rendering, and action boundaries.

## Constraints

- **Tech stack**: TypeScript for the CLI, addon API, and rendering system — this is explicitly required by the user and should unify the development model.
- **Compatibility**: Hardware support is limited to devices supported by `node-elgato-stream-deck` — this defines the practical device boundary for v1.
- **Scope**: v1 is CLI-only — the desktop app is deferred to reduce delivery risk and keep the first release focused.
- **Configuration**: Users edit YAML by hand — the system must be understandable and safe to configure without a GUI.
- **Extension model**: Addons are trusted and run in-process — this simplifies the first addon API but requires clear contracts and validation.
- **Performance**: Buttons should update in near real time with defaults around 500ms polling — the rendering and polling model must stay efficient enough for continuous updates.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build v1 as a CLI only | Reduces scope and focuses the first release on core device control, config, rendering, and addons | Landed |
| Use TypeScript across core and addons | Creates one language and tooling model for the product and its extension ecosystem | Landed |
| Use `node-elgato-stream-deck` as the hardware support boundary | Lets the project target any compatible supported device instead of inventing a new transport layer | Landed |
| Use hand-edited YAML for config and themes | Keeps v1 transparent, scriptable, and easy to modify without a desktop app | Landed |
| Use React-based rendering for button visuals | Enables component-driven image rendering for built-in buttons and addons | Landed |
| Support addons from both local folders and npm packages | Makes the extension model practical for local development and user installation | Landed |
| Run addons as trusted in-process code in v1 | Keeps the initial addon API simpler and avoids early sandbox complexity | Landed |

---
*Last updated: 2026-06-08 starting milestone v1.5 — Addons & UX Polish II*
