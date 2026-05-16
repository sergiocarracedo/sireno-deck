# Roadmap — Sireno Deck v1.1

**Last updated:** 2026-05-15
**Granularity:** focused milestone (4 phases)
**Total v1.1 requirements:** 12

## Phase Overview

| # | Phase | Goal | Requirements | Depends on |
|---|-------|------|--------------|------------|
| 6 | Base Contracts | Restore live date/time scheduling and add typed JSX support on the existing render contract | 5 | Completed v1.0 baseline |
| 7 | Typography + Text Behavior | Make text rendering theme-driven and explicit instead of hardcoded or overflow-driven | 3 | Phase 6 |
| 8 | Clock Visuals | Add shared clock-oriented visuals on top of the stabilized runtime and text contracts | 2 | Phases 6-7 |
| 9 | Calendar + Authoring Clarity | Finish the date-time addon with calendar-sheet and document the custom element authoring model clearly | 3 | Phases 6-7 |

All 12 v1.1 requirements are mapped. No circular dependencies.

---

### Phase 6: Base Contracts

**Status:** ✓ Complete (2026-05-14)

**Goal:** Keep the existing addon/runtime/reconciler architecture intact while fixing date-time live refresh and making custom deck elements first-class in TypeScript authoring.

**Requirements:** UIW-01, UIW-02, UIW-04, UIW-05, UIW-06

**Depends on:** Completed v1.0 runtime, renderer, and addon system

**Success criteria:**
- [x] Addon authors can write JSX using `deck-button`, `deck-text`, and `deck-surface` with typechecking
- [x] Existing helper constructors continue working for the same render elements
- [x] Live buttons still refresh only through the core runtime scheduler
- [x] Per-button `interval_ms` overrides work where supported without local timers inside addons
- [x] The built-in digital `date-time` button updates at its default cadence without regressions to the scheduler contract

**Research needed:** No additional milestone research before planning; the current research already settled the architectural direction.

---

### Phase 7: Typography + Text Behavior

**Status:** ✓ Complete (2026-05-15)

**Goal:** Replace ad hoc text styling with theme-driven typography tokens and explicit overflow behavior that the renderer can test and share.

**Requirements:** UIW-09, UIW-10, UIW-11

**Depends on:** Phase 6

**Success criteria:**
- [x] Theme schema accepts typography tokens that the renderer consumes for shared text output
- [x] Shared text rendering uses an explicit clip-only overflow contract per Phase 7 context instead of accidental overflow
- [x] A shared button wrapper primitive exists for buttons that want it, without forcing bespoke visuals to use it

**Research needed:** No — milestone research already narrowed the typography/text direction enough for planning.

---

### Phase 8: Clock Visuals

**Status:** ✓ Complete (2026-05-15)

**Goal:** Ship the first richer live visual in the new addon UI surface by adding an analog clock button type without widening the renderer more than necessary.

**Requirements:** UIW-07, UIW-12

**Depends on:** Phases 6-7

**Success criteria:**
- [x] The built-in date/time addon exposes a separate `analog-clock` button type
- [x] The analog clock uses the core scheduler with a sensible default live cadence
- [x] Fixtures or tests cover the new clock type and its scheduling/render contract

**Research needed:** No — this phase should build on the contracts stabilized in Phases 6-7.

---

### Phase 9: Calendar + Authoring Clarity

**Status:** ✓ Complete (2026-05-16)

**Goal:** Complete the milestone with a readable tear-sheet calendar visual and docs that make addon UI authoring feel intentional rather than mysterious.

**Requirements:** UIW-03, UIW-08, UIW-12

**Depends on:** Phases 6-7

**Success criteria:**
- [x] The built-in date/time addon exposes a separate `calendar-sheet` button type with a slower date-appropriate refresh cadence
- [x] The calendar visual reads as a single-key tear sheet rather than a cramped month grid
- [x] Shipped docs and examples explain JSX/custom element authoring clearly and show the non-DOM render contract
- [x] Fixtures or tests cover calendar-sheet behavior and any authoring/documentation examples added for the milestone

**Research needed:** No — this phase applies the previously decided milestone constraints.

---

## Coverage Validation

- [x] All 12 v1.1 requirements map to at least one roadmap phase
- [x] No circular dependencies: 6 → 7 → 8 and 6 → 7 → 9
- [x] Every phase has observable success criteria
- [x] Phases 8 and 9 can proceed in parallel once Phases 6-7 are stable

---

*Roadmap created: 2026-05-14*
