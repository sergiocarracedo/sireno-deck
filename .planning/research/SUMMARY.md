# Research Summary

**Domain:** Stream Deck management CLI + addon system
**Researched:** 2026-05-12
**Confidence:** HIGH

## Executive Summary

Sireno Deck targets the underserved Stream Deck customization market on Linux (with macOS/Windows support planned). Existing solutions are either Windows-only (official Elgato software) or lack extension models (open-source alternatives). The v1 build plan is: TypeScript CLI using `@elgato-stream-deck/node` for hardware, a custom React reconciler for button rendering via `sharp`, yargs for CLI structure, YAML config via js-yaml, and a trusted in-process addon system. The single highest technical risk is the custom React reconciler → sharp → Stream Deck pipeline, which should be prototyped first. The single biggest user-experience risk is Linux udev setup, which should be detected and explained clearly in the CLI.

## Recommended Stack

### Primary Technologies

| Technology | Version | Role |
|------------|---------|------|
| TypeScript | ~5.7 | Language for core and addons |
| Node.js | >=20.x LTS | Runtime |
| @elgato-stream-deck/node | ^7.6 | Stream Deck HID communication |
| yargs | ^18.0 | CLI framework |
| React + react-reconciler | ^19.x | Component model + custom renderer for button images |
| sharp | ^0.34 | Image buffer compositing and output |
| js-yaml | ^4.1 | Config and theme YAML parsing |
| systeminformation | ^5.x | System stats for built-in data buttons |
| execa | ^9.x | Command execution for button actions and status |

### Key Stack Decisions

- **Custom React reconciler over node-canvas:** React reconciler enables shared component model between built-in and addon buttons; sharp provides faster image processing than node-canvas's Cairo backend.
- **yargs over commander:** Stronger TypeScript integration, built-in completion scripts, more active community.
- **js-yaml over yaml package:** More battle-tested, simpler API, sufficient for single-document config files.
- **systeminformation over raw os module:** Provides per-core CPU%, temperature, fan speed that `os` cannot; cross-platform.
- **vitest over jest:** Faster startup, native ESM support, better TypeScript integration for new projects.

## Table Stakes Features

Features that must be in v1 — users expect these by default:

- [ ] Device detection and connection via `@elgato-stream-deck/node`
- [ ] YAML config loading with zod validation
- [ ] Custom React reconciler rendering to Stream Deck image buffers
- [ ] Main deck rendering with button layout from config
- [ ] Display-only button (static text/image)
- [ ] Action button (tap to execute command)
- [ ] Toggle button with internal and external state
- [ ] Change-deck button + sub-deck navigation
- [ ] Addon system (local folders + npm packages, manifest validation)
- [ ] Theme system with built-in themes
- [ ] Periodic scheduler with configurable intervals
- [ ] CLI lifecycle commands (start, stop, status)

## Key Architecture Decisions

### System Shape

A layered CLI architecture: yargs CLI layer → Orchestrator (config, device, addon management) → Render Engine (custom React reconciler + sharp) → Hardware layer (`@elgato-stream-deck/node`). Addons load as ES modules in-process and register button types, deck types, and assets with the central registries. State is managed through React component state with a polling scheduler for external data sources.

### Critical Boundaries

| Boundary | What It Separates | Why It Matters |
|----------|-------------------|----------------|
| React reconciler host config | React component tree / Image buffers | Enables addon authors to write React components; the host config translates to Stream Deck image format |
| AddonRegistry interface | Core system / Addon code | A single broken addon must not crash the CLI; strict module loading with per-addon error boundaries |
| DeviceManager connection state | Connected state / Disconnected state | Device hotplug/unplug is inevitable; state machine prevents crashes |
| ConfigLoader zod schemas | Untrusted YAML / Typed config | User-edited YAML can have errors; friendly error messages are table stakes |

### Recommended Build Order

1. Project scaffold + TypeScript config — foundation for everything
2. CLI entry point (yargs skeleton) — command structure before logic
3. ConfigLoader + zod schemas — drives button/deck definitions
4. DeviceManager — highest integration risk, validate hardware connectivity early
5. Custom React reconciler prototype — highest technical risk, validate rendering pipeline
6. ImageOutput (sharp pipeline) — complete the rendering chain
7. ButtonTypeRegistry + built-in button types — display-only, action, toggle, change-deck
8. DeckController + navigation — active deck management
9. ActionExecutor + PollScheduler — periodic updates and command execution
10. AddonRegistry — validates the full extension model
11. Theme system — visual customization
12. Built-in live data buttons — CPU, memory, fan speed
13. Built-in media control + emoji selector addon — validates complex addon model

## Top Pitfalls

The most dangerous mistakes for this domain, ranked by severity:

| # | Pitfall | Severity | Prevention |
|---|---------|----------|------------|
| 1 | Linux udev rules not installed → device invisible | CRITICAL | Detect and explain in `sireno start`; provide `sireno setup-udev` command |
| 2 | Device disconnect crashes the CLI | HIGH | Connection state machine with reconnection retries |
| 3 | Polling saturation overwhelms USB HID bus | HIGH | Staggered scheduling with jitter; batch writes per frame |
| 4 | Broken addon crashes entire CLI | HIGH | Per-addon try/catch during load; skip broken addons, don't abort |
| 5 | React reconciler memory leaks from unmounted components | MEDIUM | Careful host config cleanup; test with rapid deck switching |
| 6 | Blocking image processing on main thread | MEDIUM | Always use async sharp API; queue renders with concurrency limit |
| 7 | Cryptic YAML error messages | MEDIUM | Catch YAML exceptions; map to friendly messages with line numbers |
| 8 | Addon API breaks without versioning | MEDIUM | Define `AddonAPI` interface with `apiVersion` from day one |

## Implications for Roadmap

1. **Phase 0 — Rendering prototype:** The custom React reconciler → sharp → Stream Deck pipeline must be proven before any other work. This is the highest-risk component and should be a dedicated spike phase.
2. **Phase 1 — Core plumbing:** CLI skeleton, config loading, device detection. These have no dependencies on rendering and can be built in parallel with the rendering prototype if needed.
3. **Phase 2 — First rendering:** Wire the proven rendering pipeline into the real system. Ship display-only and action buttons to validate the full config → render → hardware chain.
4. **Phase 3 — Deck and navigation:** Toggle buttons, change-deck navigation, sub-decks. These depend on the rendering pipeline and button type registry being stable.
5. **Phase 4 — Addon system:** Addon loading, manifest validation, error boundaries. Depends on the button type registry and rendering model being stable enough to document as an API.
6. **Phase 5 — Live data and polish:** CPU/memory/fan buttons, media control, emoji selector, theme system. These are built-in addons that validate the full addon developer experience.
7. **Each phase should include Linux udev setup verification** as a checkpoint to ensure the device remains accessible across all development stages.

**Phase dependency graph:**
```
Phase 0 (render prototype)
    ├──> Phase 1 (core plumbing)    
    └──> Phase 2 (first rendering) ←── Phase 1
             └──> Phase 3 (decks & nav)
                      └──> Phase 4 (addon system)
                               └──> Phase 5 (live data & polish)
```

## Primary Recommendation

**Prototype the rendering pipeline first — before any other logic.** The custom React reconciler → sharp → Stream Deck buffer chain is the most technically novel component and the hardest to debug. Build a minimal proof-of-concept that renders a single static React component to a Stream Deck key. If this pipeline is slow, flickering, or memory-leaking, the entire architecture needs rethinking. All other components (config, addons, buttons) can be built around a proven rendering pipeline. The second highest priority is the Linux udev setup experience: the first thing a Linux user sees is "no device found" — that error message must be excellent.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Hardware library choice | HIGH | `@elgato-stream-deck/node` is the clear standard (v7.6.2, actively maintained, 196 stars) |
| CLI framework | HIGH | yargs is the most popular Node.js CLI tool; well-documented TypeScript support |
| Image processing | HIGH | sharp is the gold standard for Node.js image processing (32k stars, libvips-backed) |
| React reconciler | MEDIUM | react-reconciler is experimental/undocumented API; custom host configs exist (React ART, ink, react-pdf) but are uncommon |
| System monitoring | HIGH | systeminformation is well-established for cross-platform stats |
| Addon model architecture | MEDIUM | Trusted in-process is simple but API stability is unproven; needs versioning from start |
| YAML config UX | HIGH | js-yaml is reliable; the UX risk is error messages, not parsing |

## Gaps

- **React reconciler performance benchmarks needed:** No data exists on react-reconciler rendering 15+ small components at 500ms intervals to image buffers. A prototype must measure render time, buffer allocation, and memory usage.
- **Stream Deck HID write throughput limits:** The exact max writes-per-second per Stream Deck model is undocumented. Testing needed to confirm 500ms polling with 15 buttons is safe.
- **Cross-platform testing:** The project targets Linux first, but macOS and Windows HID behavior differs. The DeviceManager must be tested on all three platforms before v1 ships.
- **Addon security model for v2:** No research done on Node.js process isolation options (worker_threads, vm2, isolated-vm) for future sandboxing. Deferred per v1 scope.

---
*Research summary for: Stream Deck CLI management tool*
*Researched: 2026-05-12*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
