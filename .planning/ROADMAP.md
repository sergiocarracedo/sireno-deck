# Roadmap — Sireno Deck v1.2

**Last updated:** 2026-05-19
**Granularity:** focused milestone (6 phases)
**Total v1.2 requirements:** 9

## Phase Overview

| # | Phase | Goal | Requirements | Depends on |
|---|-------|------|--------------|------------|
| 11 | Session + Config Contracts | Introduce normalized session context, inject it consistently, and add config support for lock-aware behavior | 3 | Completed v1.1 runtime/addon/render baseline |
| 12 | Backgrounds + Text Fitting | Make the render surface explicitly handle layered backgrounds and multiple text fitting modes | 2 | Phase 11 |
| 13 | Global Wrapper/Style Primitives | Let addons register globally reusable wrapper/style primitives through validated public contracts | 1 | Phases 11-12 |
| 14 | Richer Built-in Toggles | Expand the built-in toggle surface to cover both local and command-driven authority models | 2 | Phase 11 |
| 15 | Lock-Screen Polish + Verification | Finish locked-session behavior with timed dimming and milestone-wide verification coverage | 2 | Phases 11-14 |
| 16 | Config Reload + Wrapper Polish | Add config hot-reload, deck-file references, and shared wrapper cleanup/customization controls | Post-roadmap scope | Phase 15 |

All 9 v1.2 requirements are mapped. No circular dependencies.

---

### Phase 11: Session + Config Contracts

**Status:** ✓ Complete (2026-05-18)

**Goal:** Introduce normalized OS/session context, inject it consistently, and add config-level support for lock-aware behavior.

**Requirements:** SCS-01, SCS-02, SCS-08

**Depends on:** Completed v1.1 runtime, addon authoring, and render contract baseline

**Success criteria:**
- [x] Core runtime exposes one normalized session/OS context shape containing OS type, variant, and version
- [x] Config templating, addon render, and action/status execution consume that same normalized context contract
- [x] Runtime session-monitor updates can switch to a dedicated locked-session deck or implicit fallback surface without breaking startup on unsupported hosts
- [x] Prior deck or navigation state is restored on unlock instead of dropping the user back to an arbitrary surface

**Phase 11 note:** The canonical contract, runtime lock-mode behavior, and committed review fixtures are shipped. The first `session-monitor` implementation remains a narrow seam rather than a live DBus-backed detector, and Phase 15 still owns the separate five-minute dimming clause.

**Research needed:** No additional milestone research before planning; the current research already narrowed the session/context direction.

---

### Phase 12: Backgrounds + Text Fitting

**Status:** Verified

**Goal:** Make the render surface explicitly handle layered backgrounds and multiple text fitting modes.

**Requirements:** SCS-03, SCS-04

**Depends on:** Phase 11

**Success criteria:**
- [x] Background precedence is resolved consistently as config override, then deck background, then theme background
- [x] The render contract exposes named text fitting modes rather than implicit clipping behavior
- [x] Default text behavior shrinks to fit until a readable minimum size then clips cleanly
- [x] Wrap mode is supported and covered by focused renderer verification

**Phase 12 note:** The first rollout intentionally keeps backgrounds color-only and text fitting scoped to the primary shared/default label path. Wider wrapper/style primitives remain Phase 13 work, and bespoke variants stay on their existing seams unless a low-risk reuse point appears later.

**Research needed:** No — the milestone research already settled the fit/background direction enough for planning.

---

### Phase 13: Global Wrapper/Style Primitives

**Status:** Verified

**Goal:** Let addons register globally reusable wrapper/style primitives through validated public contracts.

**Requirements:** SCS-05

**Depends on:** Phases 11-12

**Success criteria:**
- [x] The addon registry supports globally named wrapper/style primitives
- [x] Built-in and addon render surfaces can reference those primitives through the public contract
- [x] Validation rejects unknown wrapper/style references instead of failing late in rendering
- [x] Examples or tests demonstrate primitive reuse beyond a single addon-local implementation

**Phase 13 note:** Registry-backed wrapper/style primitives now ship through the addon contract, config-authored refs fail early in loader validation, addon-authored refs fail before pixel generation, and the shared/default renderer consumes bundled primitive defaults while explicit `background` and `fit` props remain authoritative. The first rollout intentionally stays narrow: `deck-button` and `deck-surface` button collections first, no theme alias layer, no compatibility matrix, and no bespoke-variant rewrite.

**Research needed:** No — registry-backed primitives are the recommended extension path from the current research.

---

### Phase 14: Richer Built-in Toggles

**Status:** Verified

**Goal:** Expand the built-in toggle surface to cover both local and command-driven authority models.

**Requirements:** SCS-06, SCS-07

**Depends on:** Phase 11

**Success criteria:**
- [ ] Internal-state toggles preserve runtime-owned state correctly across normal deck and runtime lifecycle events
- [ ] Command-driven toggles support both `get_state + set_on/set_off` and `toggle + status` models
- [ ] Toggle rendering and behavior remain coherent across refreshes and lifecycle transitions

**Research needed:** No — the milestone research already narrowed the authority-model split enough for planning.

---

### Phase 15: Lock-Screen Polish + Verification

**Status:** Not started

**Goal:** Finish locked-session behavior with timed dimming and milestone-wide verification coverage.

**Requirements:** SCS-08, SCS-09

**Depends on:** Phases 11-14

**Success criteria:**
- [ ] Locked-session mode dims after five minutes while the session remains locked
- [ ] Unlock restores prior active state cleanly after a locked-session interruption
- [ ] Fixtures, tests, and shipped examples cover session context injection, backgrounds, text fitting, wrappers/styles, toggles, and locked-session behavior

**Research needed:** No — this phase applies the already-decided milestone constraints on top of the earlier phases.

---

### Phase 16: Config Reload + Wrapper Polish

**Status:** ✓ Complete (2026-05-19)

**Goal:** Users can split deck definitions into referenced files, have config edits reload without losing the current deck when it still exists, and clean up shared wrapper visuals with removable labels and customizable accent colors.

**Depends on:** Phase 15

### Plans
- `16-01`: Expand deck-file references through the existing loader contract
- `16-02`: Live reload valid config and preserve user navigation
- `16-04`: Remove the shared footer and add narrow per-button accent overrides
- `16-03`: Surface invalid reloads on-device with a temporary error deck

**Success criteria:**
- [x] `decks.<id>: @path/to/deck.yml` resolves through the existing strict loader and preserves file/line-aware errors
- [x] Valid edits to the root config or referenced deck files trigger live reload with full-stack restore, active-deck fallback, and `main_deck` fallback in that order
- [x] Shared/default wrapper visuals drop the theme-name footer and support one explicit button-level accent override using theme tokens or raw hex colors
- [x] Invalid reloads switch to a runtime-owned temporary error deck and recover automatically on the next valid reload

**Phase 16 note:** This is post-roadmap scope that landed as wrapper/render/runtime polish on top of the v1.2 milestone. It intentionally stayed narrow: deck-file refs only, targeted file watching, rebuild-on-reload semantics, one explicit accent field, and a runtime-owned error overlay instead of a broader styling or include system.

**Research needed:** No — execution followed the Phase 16 research and context decisions already captured in planning.

---

## Coverage Validation

- [x] All 9 v1.2 requirements map to at least one roadmap phase
- [x] No circular dependencies: 11 → 12 → 13 and 11 → 14 → 15 → 16
- [x] Every phase has observable success criteria
- [x] Phase 14 can proceed in parallel with Phase 12 once Phase 11 stabilizes

---

*Roadmap created: 2026-05-17*
