# Roadmap — Sireno Deck v1.2

**Last updated:** 2026-05-18
**Granularity:** focused milestone (5 phases)
**Total v1.2 requirements:** 9

## Phase Overview

| # | Phase | Goal | Requirements | Depends on |
|---|-------|------|--------------|------------|
| 11 | Session + Config Contracts | Introduce normalized session context, inject it consistently, and add config support for lock-aware behavior | 3 | Completed v1.1 runtime/addon/render baseline |
| 12 | Backgrounds + Text Fitting | Make the render surface explicitly handle layered backgrounds and multiple text fitting modes | 2 | Phase 11 |
| 13 | Global Wrapper/Style Primitives | Let addons register globally reusable wrapper/style primitives through validated public contracts | 1 | Phases 11-12 |
| 14 | Richer Built-in Toggles | Expand the built-in toggle surface to cover both local and command-driven authority models | 2 | Phase 11 |
| 15 | Lock-Screen Polish + Verification | Finish locked-session behavior with timed dimming and milestone-wide verification coverage | 2 | Phases 11-14 |

All 9 v1.2 requirements are mapped. No circular dependencies.

---

### Phase 11: Session + Config Contracts

**Status:** Verified

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

**Status:** Not started

**Goal:** Let addons register globally reusable wrapper/style primitives through validated public contracts.

**Requirements:** SCS-05

**Depends on:** Phases 11-12

**Success criteria:**
- [ ] The addon registry supports globally named wrapper/style primitives
- [ ] Built-in and addon render surfaces can reference those primitives through the public contract
- [ ] Validation rejects unknown wrapper/style references instead of failing late in rendering
- [ ] Examples or tests demonstrate primitive reuse beyond a single addon-local implementation

**Research needed:** No — registry-backed primitives are the recommended extension path from the current research.

---

### Phase 14: Richer Built-in Toggles

**Status:** Not started

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

## Coverage Validation

- [x] All 9 v1.2 requirements map to at least one roadmap phase
- [x] No circular dependencies: 11 → 12 → 13 and 11 → 14 → 15
- [x] Every phase has observable success criteria
- [x] Phase 14 can proceed in parallel with Phase 12 once Phase 11 stabilizes

---

*Roadmap created: 2026-05-17*
