# Feature Research

**Domain:** Stream Deck management CLI + addon system
**Researched:** 2026-05-12
**Confidence:** HIGH

## Table Stakes

Features users expect by default. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Device detection and connection | Core product value; without hardware connection nothing else works | MEDIUM | Must handle multiple devices, hotplug/unplug, Linux udev rules |
| YAML config loading | Configuration is the primary user interface in v1; hand-edited | LOW | Parse `config.yml` with js-yaml; validate with zod schema |
| Button rendering to Stream Deck display | The fundamental visual output; buttons must appear on the hardware | HIGH | Requires custom React reconciler + sharp image buffer pipeline |
| Main deck with button grid | Users need to see their configured buttons immediately | MEDIUM | Map config button positions to hardware key indices |
| Deck navigation (main deck + sub-decks) | Sub-decks are a core concept; navigation is table stakes | MEDIUM | Back-button on sub-decks returns to parent or main deck |
| Action button (tap to execute command) | Most basic interactive button; the "hello world" of the system | LOW | Execute command via execa, render icon/text |
| Display-only button (text or image) | Simple information display; foundation for all data buttons | LOW | React component → sharp → Stream Deck buffer |
| Addon loading from local folders | Extension model is a core differentiator; must load addons at startup | MEDIUM | Scan addon directories, validate manifests, import addon modules |
| Addon loading from npm packages | User explicitly wanted npm installable addons | MEDIUM | Per-package directory scanning similar to local addons |
| YAML theme system | Visual customization is a core requirement | LOW | Parse theme YAML; apply tokens to button rendering |
| CLI start/stop/status commands | Users need to control the daemon process | LOW | yargs subcommands for lifecycle management |
| Periodic button refresh (500ms default) | Live data buttons need to update; the polling model is fundamental | MEDIUM | Central scheduler; debounced per-button intervals |

## Differentiators

Features that set the product apart. Not required for launch, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| React-based addon button components | Addon developers write React components, not raw image buffers | HIGH | Custom reconciler host config; but dramatically lowers addon developer barrier |
| Toggle button with external state | External command-driven state machine; unique to this project | MEDIUM | State command + display command per state + action per state |
| Change-deck button | Navigate between decks with a button tap; composable UIs | LOW | Built-in button type that switches active deck by ID |
| Addon-provided deck types | Addons can ship entire decks (e.g., emoji selector deck) | MEDIUM | Declared in addon manifest; user references deck type ID in config |
| Addon-provided icon sets | Addons can bundle reusable assets shared across buttons | LOW | Icons loaded during addon initialization; referenced by path in config |
| Built-in live data buttons (CPU, Mem, Fan) | First-class hardware monitoring on the Stream Deck | MEDIUM | Uses systeminformation; configurable display format (bar/text) |
| Built-in media control button | Toggle play/pause with external state tracking | MEDIUM | User-provided state command; multi-state toggle behavior |
| Media info display (title, artist, time) | Display current track info from player | LOW | Display command per toggle state |
| Emoji selector deck | Built-in sub-deck for emoji selection; configurable favorites | MEDIUM | Deck type with category sub-decks; emoji as button images |

## Anti-Features

Features that seem good but create problems. Prevent scope creep by documenting them.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Desktop GUI app in v1 | Natural desire for visual management | Doubles the scope before validating core CLI works; Electron dependency is heavy | CLI-first; add GUI editor in v2 after CLI is stable |
| Real-time button updates via push/events | Feels more responsive than polling | Requires persistent socket per button or device event system; over-engineering for v1 | Configurable polling (500ms default); sufficient for use case |
| Addon hot-reload at runtime | Developer convenience during addon creation | Complex module cache invalidation; state migration for running buttons | File watcher triggers CLI restart; acceptable for v1 |
| Remote/web-based Stream Deck control | Useful for headless servers | Requires network transport, auth, WebSocket; far outside v1 scope | Defer to v2 or addon ecosystem |
| Button drag-and-drop positioning in config | Intuitive UX for layout | Requires GUI; contradicts hand-edited YAML model for v1 | Numbered key positions in YAML; matches Stream Deck key indices |
| Multi-device management (assign buttons per device) | Users with multiple Stream Decks | Complicates config and rendering model significantly | Single device in v1; add multi-device in v2 |

## Feature Dependencies

```
[YAML config loading]
    └──required by──> [Button rendering]
                        └──required by──> [Display-only button]
                        └──required by──> [Action button]
                        └──required by──> [Toggle button]
                                          └──required by──> [Change-deck button]

[Device detection]
    └──required by──> [Button rendering]

[React reconciler (image output)]
    └──required by──> [Button rendering]
    └──required by──> [Addon button components]

[Addon manifest validation]
    └──required by──> [Addon loading (local)]
    └──required by──> [Addon loading (npm)]

[Theme system]
    └──enhances──> [Button rendering]

[Periodic scheduler]
    └──enhances──> [Display-only button]
    └──enhances──> [Toggle button (state polling)]

[Deck navigation]
    └──required by──> [Change-deck button]
    └──required by──> [Sub-deck rendering]
```

### Dependency Notes

- **Button rendering requires YAML config + device connection:** Cannot render anything until config is loaded and hardware is connected.
- **Addon loading must complete before button rendering can start:** Addons may provide button types referenced in config.
- **React reconciler is the single highest-risk component:** A custom reconciler for image output is unusual; must be built and proven early.
- **Toggle button depends on the periodic scheduler** for state polling and the action system for tap handling.
- **Emoji selector deck is a composition of all other primitives:** It validates that the deck/button/addon model supports real addon use cases.

## MVP Definition

### Launch With (v1)

- [ ] Device detection + connection via `@elgato-stream-deck/node` — [why essential] No hardware = no product
- [ ] YAML config loading with zod validation — [why essential] Primary user interface for v1
- [ ] Custom React reconciler rendering to Stream Deck image buffers — [why essential] Core rendering pipeline
- [ ] Main deck rendering with positioned buttons — [why essential] Users must see their configuration working
- [ ] Display-only button (static text/image) — [why essential] Simplest button; proves rendering pipeline
- [ ] Action button (tap to run command) — [why essential] Simplest interactive button
- [ ] Toggle button with internal state + external state polling — [why essential] Most complex built-in button; proves state/action model
- [ ] Change-deck button + sub-deck navigation — [why essential] Multi-deck navigation is core concept
- [ ] Addon system: local folders + npm packages, manifest validation, button type registration — [why essential] The key differentiator
- [ ] Theme system with at least 2 built-in themes — [why essential] Visual customization requirement
- [ ] Periodic scheduler with configurable intervals — [why essential] All live data buttons depend on this
- [ ] CLI commands: `start`, `stop`, `status` — [why essential] Users need to control the process

### Add After Validation (v1.x)

- [ ] CPU usage button — [trigger for adding] After basic rendering and periodic scheduler are stable
- [ ] Memory usage button — [trigger for adding] Same as CPU; just another data source
- [ ] Fan speed button — [trigger for adding] May not work on all systems; defer until CPU/mem confirmed
- [ ] Media control button (play/pause toggle) — [trigger for adding] Depends on toggle button being stable
- [ ] Emoji selector addon (first-party addon) — [trigger for adding] Validates that addon model supports complex decks
- [ ] Audio control (volume) button — [trigger for adding] Depends on command execution model being stable

### Future Consideration (v2+)

- [ ] Desktop GUI app — [why defer] Major scope increase; CLI must be stable first
- [ ] Multi-device support — [why defer] Complicates config and rendering model
- [ ] Addon sandboxing/process isolation — [why defer] Trusted in-process is sufficient for v1
- [ ] Remote/web control — [why defer] Separate transport layer and auth system
- [ ] Button marketplace / addon registry — [why defer] Needs addon ecosystem to exist first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Device detection + connection | HIGH | MEDIUM | P1 |
| YAML config loading | HIGH | LOW | P1 |
| React reconciler rendering | HIGH | HIGH | P1 |
| Main deck with button grid | HIGH | MEDIUM | P1 |
| Display-only button | HIGH | LOW | P1 |
| Action button | HIGH | LOW | P1 |
| Toggle button | HIGH | MEDIUM | P1 |
| Change-deck + sub-deck nav | HIGH | MEDIUM | P1 |
| Addon system (local + npm) | HIGH | MEDIUM | P1 |
| Theme system | MEDIUM | LOW | P1 |
| Periodic scheduler | HIGH | MEDIUM | P1 |
| CLI lifecycle commands | HIGH | LOW | P1 |
| CPU usage button | MEDIUM | LOW | P2 |
| Memory usage button | MEDIUM | LOW | P2 |
| Fan speed button | LOW | LOW | P2 |
| Media control button | MEDIUM | MEDIUM | P2 |
| Emoji selector addon | MEDIUM | MEDIUM | P2 |
| Audio control | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---
*Feature research for: Stream Deck CLI management tool*
*Researched: 2026-05-12*
