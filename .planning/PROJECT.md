# Sireno Deck

## What This Is

Sireno Deck is a TypeScript CLI for controlling and managing Stream Deck devices through a YAML-defined system of buttons, decks, themes, and addons. It targets Linux, macOS, and Windows users who own compatible hardware and want a programmable, extensible alternative to existing Stream Deck tools, with Linux support as the minimum bar for v1.

## Core Value

Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.

## Current Milestone: v1.4 — Build, Bundle & UX Polish

**Goal:** Make the CLI distributable as standalone Linux and Mac executables, expand the bundled addon surface, and add the system-reserved back button for subdeck navigation.

**Target features:**
- Build and bundle workflow that produces Linux and Mac executables in `/works/test/test-sireno-deck`
- Auto-install Chromium on first run when missing (no bundled Playwright, license-safe)
- Calendar button in the built-in date-time addon (month/day/weekday vertical layout)
- New bundled weather addon (icon + temperature + location)
- Media-player addon: mute toggle (real state), volume up, volume down
- Emoji-selector multi-page layout: split large categories across pages with next/prev
- System-reserved last button: hard-reserved, core-owned back button in subdecks (tap → previous, hold → home), empty placeholder in main deck

## Latest Shipped Milestone: v1.3 Addon Extensibility & Live Hardware

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

- TBD for v1.3 Typography and Rich Formatting. Define them through `new-milestone` requirements and roadmap.

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
*Last updated: 2026-05-28 after starting milestone v1.3*
