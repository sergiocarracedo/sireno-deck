# Requirements — Sireno Deck

**Version:** v1.0
**Last updated:** 2026-05-12

## v1 Requirements

### Core Infrastructure

| ID | Requirement | Category |
|----|-------------|----------|
| INFRA-01 | User can connect sireno-deck to a Stream Deck device detected via USB on Linux | Device |
| INFRA-02 | User receives a clear error with fix instructions when the device is visible via lsusb but blocked by udev rules | Device |
| INFRA-03 | User's CLI process survives device disconnect and reconnects when the device is plugged back in | Device |
| INFRA-04 | User can define all button layout, decks, themes, and settings in a single `config.yml` file | Config |
| INFRA-05 | User receives a readable error message with file path, line number, and suggestion when config.yml has YAML syntax errors or schema violations | Config |
| INFRA-06 | User can start the sireno daemon with `sireno start` | CLI |
| INFRA-07 | User can stop the sireno daemon with `sireno stop` | CLI |
| INFRA-08 | User can check daemon status with `sireno status` | CLI |
| INFRA-09 | User can see CLI help output with `sireno --help` | CLI |
| INFRA-10 | Buttons that require periodic display updates refresh at their configured interval (default 500ms) | Scheduler |
| INFRA-11 | Multiple polling intervals across different buttons are staggered with jitter to avoid USB bus saturation | Scheduler |

### Rendering

| ID | Requirement | Category |
|----|-------------|----------|
| RENDER-01 | Built-in and addon buttons can define their visuals as React components | Render |
| RENDER-02 | React component output is converted to Stream Deck-compatible image buffers and written to the correct hardware key | Render |
| RENDER-03 | Button images only update on the device when the rendered content changes (no unnecessary rewrites) | Render |
| RENDER-04 | User can define a theme as a YAML file with background, accent, primary color, and other visual tokens | Theme |
| RENDER-05 | User can switch between themes by referencing a theme name in config.yml | Theme |
| RENDER-06 | At least two built-in themes (dark and light) ship with the CLI | Theme |

### Button Types

| ID | Requirement | Category |
|----|-------------|----------|
| BTN-01 | User can configure a display-only button that renders static text or an image on a Stream Deck key | Buttons |
| BTN-02 | User can configure an action button that executes a shell command when tapped | Buttons |
| BTN-03 | User can configure an action button whose display text is the output of a command run periodically | Buttons |
| BTN-04 | User can configure a toggle button that cycles through multiple states on tap, each with its own display and action | Buttons |
| BTN-05 | User can configure a toggle button whose state is determined by an external status command instead of internal state | Buttons |
| BTN-06 | User can configure a change-deck button that navigates to a sub-deck by ID | Buttons |
| BTN-07 | User can configure a CPU usage button displaying current CPU% as a progress bar or text | Buttons |
| BTN-08 | User can configure a memory usage button displaying current memory usage as a progress bar or text | Buttons |
| BTN-09 | User can configure a fan speed button displaying current fan speeds, degrading gracefully when sensors are unavailable | Buttons |
| BTN-10 | User can configure a media control button that toggles play/pause via command and displays current track info from external state commands | Buttons |

### Addons & Decks

| ID | Requirement | Category |
|----|-------------|----------|
| ADDN-01 | User can install addons by placing a folder with a manifest in the addons directory | Addons |
| ADDN-02 | User can install addons via npm packages listed in config or installed alongside the CLI | Addons |
| ADDN-03 | The CLI validates each addon manifest against a schema and skips broken addons without crashing | Addons |
| ADDN-04 | Addon authors can implement custom button types by providing a React component and registering it | Addons |
| ADDN-05 | Addon authors can define custom deck types with pre-configured button layouts | Addons |
| ADDN-06 | Addon authors can ship reusable assets (icons, images) referenced by path in button config | Addons |
| ADDN-07 | The addon API declares an `apiVersion`; addons declare their target version in the manifest; mismatches are rejected | Addons |
| ADDN-08 | User can navigate from the main deck to sub-decks and return via a back button | Decks |
| ADDN-09 | User can configure a main deck and multiple sub-decks in config.yml with button positions per deck | Decks |
| ADDN-10 | User can use the emoji selector addon to browse and select emojis by category with configurable favorites | Addons |

## v2 Requirements (Deferred)

Features not selected for v1 but documented for future consideration:

| ID | Requirement | Reason Deferred |
|----|-------------|-----------------|
| V2-01 | Desktop GUI app for visual Stream Deck management | Explicitly out of scope for v1; CLI validation first |
| V2-02 | Addon sandboxing or process isolation | Trusted in-process is sufficient for v1 ecosystem |
| V2-03 | Multi-device support (multiple Stream Decks) | Complicates config and rendering; single device first |
| V2-04 | Remote/web-based Stream Deck control | Requires network transport and auth; v2 feature |
| V2-05 | Button drag-and-drop positioning | Requires GUI; YAML editing is v1 model |
| V2-06 | Weather button | Deferred until live data pattern is stable |
| V2-07 | Audio/volume control button | Deferred; user didn't select for v1 |
| V2-08 | Addon hot-reload at runtime | Complex module cache invalidation; acceptable to restart CLI in v1 |
| V2-09 | Real-time push/event-based button updates | Polling sufficient for v1 use case |

### Out of Scope (Never)

| Item | Reason |
|------|--------|
| Official Elgato Stream Deck software compatibility | This is a replacement, not a plugin for their software |
| Browser-based control as primary interface | CLI-first; web control would be a separate product |
| Closed-source addon model | Addons are TypeScript source; trust model relies on visibility |

## Phase Traceability

| Phase | Status | Requirements | Evidence |
|------|--------|--------------|----------|
| 1 — Foundation | Complete | INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09 | `.planning/phases/01-foundation/01-01-SUMMARY.md`, `.planning/phases/01-foundation/01-02-SUMMARY.md` |
| 2 — Device + Rendering | Complete | INFRA-01, INFRA-02, INFRA-03, RENDER-01, RENDER-02, RENDER-03, INFRA-10, INFRA-11 | `.planning/phases/02-device-rendering/02-01-SUMMARY.md`, `.planning/phases/02-device-rendering/02-02-SUMMARY.md`, `.planning/phases/02-device-rendering/02-03-SUMMARY.md`, `.planning/phases/02-device-rendering/02-VERIFICATION.md` |
| 3 — Themes + Basic Buttons | Complete | RENDER-04, RENDER-05, RENDER-06, BTN-01, BTN-02, BTN-03, BTN-06, ADDN-08, ADDN-09 | `.planning/phases/03-themes-basic-buttons/03-01-SUMMARY.md`, `.planning/phases/03-themes-basic-buttons/03-02-SUMMARY.md`, `.planning/phases/03-themes-basic-buttons/03-03-SUMMARY.md`, `.planning/phases/03-themes-basic-buttons/03-VERIFICATION.md` |
| 4 — Advanced Buttons | Complete | BTN-04, BTN-05, BTN-07, BTN-08, BTN-09, BTN-10 | `.planning/phases/04-advanced-buttons/04-01-SUMMARY.md`, `.planning/phases/04-advanced-buttons/04-02-SUMMARY.md`, `.planning/phases/04-advanced-buttons/04-03-SUMMARY.md`, `.planning/phases/04-advanced-buttons/04-VERIFICATION.md` |
| 5 — Addon System | Complete | ADDN-01, ADDN-02, ADDN-03, ADDN-04, ADDN-05, ADDN-06, ADDN-07, ADDN-10 | `.planning/phases/05-addon-system/05-01-SUMMARY.md`, `.planning/phases/05-addon-system/05-02-SUMMARY.md`, `.planning/phases/05-addon-system/05-03-SUMMARY.md`, `.planning/phases/05-addon-system/05-VERIFICATION.md` |

---

*Requirements defined: 2026-05-12*
*Total v1 requirements: 37 (INFRA: 11, RENDER: 6, BTN: 10, ADDN: 10)*
