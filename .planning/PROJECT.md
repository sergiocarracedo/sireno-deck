# Sireno Deck

## What This Is

Sireno Deck is a TypeScript CLI for controlling and managing Stream Deck devices through a YAML-defined system of buttons, decks, themes, and addons. It targets Linux, macOS, and Windows users who own compatible hardware and want a programmable, extensible alternative to existing Stream Deck tools, with Linux support as the minimum bar for v1.

## Core Value

Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Ship a v1 CLI in TypeScript that can detect and control devices supported by `node-elgato-stream-deck`, with Linux as the minimum supported OS and a path to macOS and Windows support.
- [ ] Support a YAML-based `config.yml` that defines global settings, themes, the main deck, additional decks, button placement, and per-button configuration edited by users by hand.
- [ ] Implement core button and deck concepts: main deck, nested decks with back navigation, button types, and button instances.
- [ ] Provide built-in button types for change-deck, display-only, action, and toggle behaviors.
- [ ] Provide built-in live data buttons for CPU usage, memory usage, fan speed, emoji selector, audio control, and media control.
- [ ] Support periodic status and display updates for buttons, with default polling around 500ms and user-configurable intervals.
- [ ] Use a React-based rendering model so built-in buttons and addons can render images or visual output through components.
- [ ] Support trusted in-process addons written in TypeScript, installable from local folders and npm packages.
- [ ] Let addons provide button types, button instances, deck types, deck instances, manifests, bundled decks, and reusable assets such as icons.
- [ ] Provide a YAML-based theme system for global visual tokens such as background, accent, and primary colors, plus a small set of built-in themes.

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
| Build v1 as a CLI only | Reduces scope and focuses the first release on core device control, config, rendering, and addons | — Pending |
| Use TypeScript across core and addons | Creates one language and tooling model for the product and its extension ecosystem | — Pending |
| Use `node-elgato-stream-deck` as the hardware support boundary | Lets the project target any compatible supported device instead of inventing a new transport layer | — Pending |
| Use hand-edited YAML for config and themes | Keeps v1 transparent, scriptable, and easy to modify without a desktop app | — Pending |
| Use React-based rendering for button visuals | Enables component-driven image rendering for built-in buttons and addons | — Pending |
| Support addons from both local folders and npm packages | Makes the extension model practical for local development and user installation | — Pending |
| Run addons as trusted in-process code in v1 | Keeps the initial addon API simpler and avoids early sandbox complexity | — Pending |

---
*Last updated: 2026-05-12 after new-project questioning*
