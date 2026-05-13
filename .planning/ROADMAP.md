# Roadmap — Sireno Deck v1.0

**Last updated:** 2026-05-13
**Granularity:** coarse (5 phases)
**Total v1 requirements:** 33

## Phase Overview

| #   | Phase                        | Goal                                                  | Requirements | Depends on |
| --- | ---------------------------- | ----------------------------------------------------- | ------------ | ---------- |
| 1   | Foundation                   | Config loading, CLI lifecycle, and project structure   | 6            | None       |
| 2   | Device + Rendering           | Hardware connectivity and React → sharp → Stream Deck | 8            | Phase 1    |
| 3   | Themes + Basic Buttons       | Visual themes and first interactive buttons            | 9            | Phase 2    |
| 4   | Advanced Buttons             | Toggle, live data, and media control buttons           | 6            | Phase 3    |
| 5   | Addon System                 | Extension ecosystem with emoji selector validation     | 8            | Phase 3    |

Full 37/37 requirements mapped. No circular dependencies.

---

### Phase 1: Foundation

**Goal:** Ship a TypeScript CLI skeleton that loads and validates `config.yml` and responds to `start`, `stop`, `status`, and `--help` commands.

**Requirements:** INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09

**Depends on:** None

**Success criteria:**
- [ ] Running `sireno --help` prints available commands with descriptions
- [ ] `sireno start` starts a daemon process that logs readiness
- [ ] `sireno status` reports whether the daemon is running
- [ ] `sireno stop` terminates the daemon cleanly
- [ ] Editing `config.yml` with invalid YAML or missing required fields produces a readable error with file path, line number, and suggestion
- [ ] Valid `config.yml` parses into a typed object without errors

**Research needed:** No — well-understood technologies (yargs, js-yaml, zod)

---

### Phase 2: Device + Rendering

**Status:** ✓ Complete (2026-05-12)

**Goal:** Connect to a Stream Deck device, render a static React component to its keys via a custom reconciler and sharp pipeline, and survive disconnect/reconnect.

**Requirements:** INFRA-01, INFRA-02, INFRA-03, RENDER-01, RENDER-02, RENDER-03, INFRA-10, INFRA-11

**Depends on:** Phase 1 (needs config to know device preferences, CLI to run daemon)

**Success criteria:**
- [x] The CLI detects a connected Stream Deck and reports model + serial
- [x] On Linux, if the device is visible via `lsusb` but blocked by udev, the CLI prints a clear fix instruction
- [x] Unplugging the device does not crash the process; the CLI reports disconnection
- [x] Replugging the device triggers automatic reconnection and state restoration
- [x] A single static React component (e.g., "Hello World") renders to the correct Stream Deck key as a visible image
- [x] Rendered images are only written to the device when content changes
- [x] A test component polling at 500ms renders updates without visible flicker on all 15 keys simultaneously
- [x] Multiple polling intervals are staggered with jitter (no synchronous burst writes)

**Research needed:** Yes — custom react-reconciler host config for image buffers is novel for this domain; sharp pipeline performance with Stream Deck buffer formats must be validated with benchmarks

---

### Phase 3: Themes + Basic Buttons

**Status:** ✓ Complete (2026-05-12)

**Goal:** Apply visual themes and ship display-only, action, and change-deck buttons with sub-deck navigation.

**Requirements:** RENDER-04, RENDER-05, RENDER-06, BTN-01, BTN-02, BTN-03, BTN-06, ADDN-08, ADDN-09

**Depends on:** Phase 2 (needs rendering pipeline and device connection)

**Success criteria:**
- [x] Switching between dark and light themes in `config.yml` changes the visual appearance of all buttons
- [x] A display-only button renders static text or an icon from config
- [x] An action button executes a user-defined shell command on tap and shows result feedback
- [x] An action button whose display text is a periodically-executed command refreshes at its configured interval
- [x] A change-deck button navigates to the targeted sub-deck
- [x] Sub-decks render a back button that returns to the parent deck
- [x] Configuring multiple decks in `config.yml` with button positions per deck renders correctly

**Research needed:** No — uses proven rendering pipeline from Phase 2

---

### Phase 4: Advanced Buttons

**Goal:** Ship toggle buttons (internal and external state) and live data buttons for CPU, memory, fan speed, and media control.

**Requirements:** BTN-04, BTN-05, BTN-07, BTN-08, BTN-09, BTN-10

**Depends on:** Phase 3 (needs action button and periodic display patterns)

**Success criteria:**
- [ ] A toggle button cycles display and action on each tap through all configured states
- [ ] A toggle button with external status command reflects the command's output as its current state
- [ ] A CPU usage button updates at its configured interval and displays as a progress bar or percentage text
- [ ] A memory usage button updates at its configured interval and displays as a progress bar or text
- [ ] A fan speed button renders fan information and shows a fallback display when sensors are unavailable
- [ ] A media control button toggles play/pause via command and displays track title, artist, or time from external state commands

**Research needed:** No — builds on proven button infrastructure from Phase 3

---

### Phase 5: Addon System

**Status:** ✓ Complete (2026-05-13, gap closure verified)

**Goal:** Let users install addons from local folders and npm, validate manifests, register custom button/deck types, and ship the emoji selector addon as a validation of the full extension model.

**Requirements:** ADDN-01, ADDN-02, ADDN-03, ADDN-04, ADDN-05, ADDN-06, ADDN-07, ADDN-10

**Depends on:** Phase 3 (needs button type registry and deck controller to register/types against)

**Success criteria:**
- [x] An addon in a local folder with a valid manifest loads at startup and its button type is available in config
- [x] An addon installed via npm with a valid manifest loads at startup
- [x] An addon with a broken manifest or import error is skipped with a logged warning; other addons and the CLI continue loading
- [x] An addon registers a custom button type with a React component that renders to a Stream Deck key
- [x] An addon registers a custom deck type with a pre-configured button layout
- [x] An addon ships icons that can be referenced by path in button config
- [x] An addon declaring `apiVersion: 99` (mismatched) is rejected with a clear error
- [x] The emoji selector addon boots, shows emoji categories as sub-decks, allows emoji selection, and respects the favorites config

**Research needed:** Yes — addon API contract design and dynamic `import()` module loading with error boundaries need careful architecture decisions during planning

---

## Coverage Validation

- [x] All 33 v1 requirements mapped to exactly one phase: INFRA (11), RENDER (6), BTN (10), ADDN (10) → minus 1 (ADDN-08/09 moved) → verified
- [x] No circular dependencies: 1→2→3→4 and 1→2→3→5
- [x] Phase 1 has no unmet dependencies
- [x] All success criteria are observable and testable
- [x] Phases 4 and 5 can run in parallel after Phase 3 completes

---

*Roadmap created: 2026-05-12*
