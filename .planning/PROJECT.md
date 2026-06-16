# Sireno Deck

## What This Is

Sireno Deck is a TypeScript CLI for controlling and managing Stream Deck devices through a YAML-defined system of buttons, decks, themes, and addons. It targets Linux, macOS, and Windows users who own compatible hardware and want a programmable, extensible alternative to existing Stream Deck tools, with Linux support as the minimum bar for v1.

## Core Value

Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.

## Current Milestone: v1.7 (planning)

Run `/new-milestone` to define v1.7 scope, requirements, and phases. The shipped v1.6 milestone (just below) is the reference for what v1.7 builds on.

## Latest Shipped Milestone: v1.6 — UX Speed & Overlay Extensions

**Completed:** 2026-06-15
**Phases:** 10 (57-62, 66-70, including 4 gap-closure phases 67-70)
**Requirements delivered:** RES-01..03, PERF-01..03, EMO-15..17, PAG-02..03, ICON-01, ACTIVEAPP-07/07a/07b/08, SETTINGS-05..07, CHROME-01, VERIFY-02 (21 total)

**Key achievements:**
- Render pipeline profiled, performance bottlenecks identified and fixed (back button <200ms in-process, weather page transitions <300ms in-process)
- Emoji keystroke injection: `methods.pasteText` now simulates the OS paste keystroke (Ctrl+V / Cmd+V) after clipboard write, fixing the "tap emoji does nothing" bug end-to-end
- Emoji category deduplication: 11 visually distinct category icons, smileys/people no longer share
- Pagination button redesign: 3-line layout (Tap > / < 2xTap / Page X/Y) using shared `<Label>` for fit
- Icon updates: system back `undo2`, overlay toggle `send-to-back` + active deck badge
- Overlay `autoShow: false` mode with 2-line back button variant (back tap / overlay summon dbl-tap)
- SplitActionSurface component: unified dual-action surface replacing 3 bespoke system button variants
- Settings deck layout revamp: fixed positions 0/1/2/4 (Dimmer/Brighter/Percent/Logo), n-1 reserved for back button
- Chrome overlay deck extensions: 7 keyboard-shortcut buttons (New tab, Close tab, Unclose tab, Incognito, Reload, Hard reload, Dev tools)
- v1.6 verification sweep + metadata backfill (3 missing per-phase VERIFICATIONs aggregated into 70-VERIFICATION, 3 missing Phase 59 SUMMARYs backfilled, 67-CONTEXT D-01..D-08 invalidation preserved, REQUIREMENTS.md SETTINGS-06 realigned, PROJECT/STATE/ROADMAP consistency set updated)

See `.planning/v1.6-MILESTONE-AUDIT.md` and `.planning/REQUIREMENTS.md` for the canonical v1.6 artifact set.

## Requirements

### Validated

- Background precedence, text fitting, wrapper/style primitives, richer built-in toggles, lock-deck substitution/restore behavior, browser-rendered theme/font delivery, mounted addon rendering, TSX-first built-ins, and emulator/browser verification all shipped across the v1.2 line and its follow-on hardening phases.
- v1.5 — Addons & UX Polish II (25 requirements, all shipped; weather city name + 2-day forecast, bars content polish, settings deck, lock deck access — see `.planning/milestones/v1.5-ROADMAP.md` and `.planning/milestones/v1.5-REQUIREMENTS.md`).
- v1.6 — UX Speed & Overlay Extensions (21 requirements, all shipped; render pipeline performance, emoji keystroke injection, pagination redesign, icon updates, overlay `autoShow` mode, `SplitActionSurface` system button, settings deck layout revamp, chrome overlay deck extensions — see `.planning/milestones/v1.6-ROADMAP.md` and `.planning/milestones/v1.6-REQUIREMENTS.md`).
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

*(v1.6 was the most recent active milestone; it is now shipped — see "Latest Shipped Milestone" above. v1.7 requirements are pending `/new-milestone`.)*

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
*Last updated: 2026-06-15 shipping milestone v1.6 — UX Speed & Overlay Extensions*
