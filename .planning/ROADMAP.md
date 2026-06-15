# Roadmap — Sireno Deck

**Version:** v1.6 — UX Speed & Overlay Extensions
**Milestone goal:** Fix UX friction from real use (slow button transitions, broken emoji injection), overhaul overlay UX with configurable auto-show and refined components, and extend the chrome overlay deck.
**Last updated:** 2026-06-11

## Milestone Summary

v1.6 starts with a research phase to profile the render pipeline and nail down the approach to emoji keystroke injection, then proceeds through implementation phases. The ordering is research → fix → polish: understand the back button bottleneck first, fix it, then layer on the UX improvements that depend on a fast render cycle.

The emoji injection path (`clipboard.ts:pasteText`) only writes to the clipboard via `clipboardy.write()` — it never simulates Ctrl+V / Cmd+V. This is the root cause of "tap does nothing." The fix will need an OS-abstracted keystroke simulation helper.

## Phases

### Phase 57: Render pipeline & emoji research ✓

**Goal:** Profile the full gesture-to-render pipeline to find the back button delay root cause; research cross-platform keystroke simulation; audit emoji category data.
**Requirements:** `RES-01`, `RES-02`, `RES-03`
**Depends on:** None
**Status:** ✓ Complete (2026-06-11)
**Success criteria:**
- [x] A profile trace identifies the slowest hop in `handleTap` → `onTap` → `navigateToDeck` / `goBack` → `activateDeckSurface` → `renderDeckSurface` → `renderMountedDeckButtons` → `emitRenderedDeck` → browser capture loop (if applicable)
- [x] The research identifies whether the bottleneck is in the runtime JS (await chains, button re-instantiation) or the browser renderer (capture cadence, timeout waits)
- [x] Keystroke simulation approaches are documented per platform: xdotool/wtype on Linux, osascript on macOS, SendInput on Windows
- [x] A recommended `methods` API extension is proposed (e.g. `sendKeystrokes(text: string)` that pairs clipboard write with simulated paste)
- [x] Emoji category data source is identified and the smiles/people overlap root cause is documented

### Phase 58: Performance fixes

**Goal:** Implement the fixes identified in Phase 57 to bring back button transitions under 200ms and weather page changes under 300ms.
**Requirements:** `PERF-01`, `PERF-02`, `PERF-03`
**Depends on:** 57
**Status:** ✓ Complete (2026-06-11)
**Success criteria:**
- [x] Back button tap → previous deck visible completes in <200ms (in-process avg=12.35ms, same-html-skip avg=2.39ms)
- [x] Weather daily/hourly page transitions complete in <300ms (in-process avg=16.01ms)
- [x] No regressions in any existing test suite (504 passed, 130 baseline failures unchanged)

### Phase 59: Emoji keystroke injection + category fix

**Goal:** Make emoji tap actually paste into the active input; deduplicate categories.
**Requirements:** `EMO-15`, `EMO-16`, `EMO-17`
**Depends on:** 57
**Success criteria:**
- [ ] `methods.pasteText()` or a new `methods.sendText()` writes to clipboard AND simulates OS paste keystroke
- [ ] Emoji category data is audited and smiles/people (and any other overlaps) use distinct emoji sets

### Phase 60: Pagination button redesign

**Goal:** Replace the current pagination button with a 3-line layout shown exactly as specified.
**Requirements:** `PAG-02`, `PAG-03`
**Depends on:** None
**Success criteria:**
- [ ] Pagination button renders 3 lines: "Tap >", "< 2xTap", "Page X/Y"
- [ ] No text overflow at any page count
- [ ] Uses `<Label>` or equivalent fitting component

### Phase 61: Icon updates

**Goal:** Update the system back button to `undo2` and the overlay toggle to `send-to-back` + deck icon.
**Requirements:** `ICON-01`, `ACTIVEAPP-08`
**Depends on:** None
**Success criteria:**
- [ ] System back button renders `undo2` icon instead of `chevron-left`
- [ ] Overlay toggle button renders `send-to-back` icon + overlay deck icon/name

### Phase 62: Overlay auto-show mode

**Goal:** Allow overlay decks to configure `autoShow: false` and show a smart back button variant instead.
**Requirements:** `ACTIVEAPP-07`, `ACTIVEAPP-07a`, `ACTIVEAPP-07b`
**Depends on:** 55, 57
**Success criteria:**
- [ ] `autoShow: false` on a deck with `process_names` prevents automatic overlay switching
- [ ] A 2-line variant of the system back button appears in the last position showing back icon + "Tap" and overlay icon + "2xTap"
- [ ] Double-tap summons the overlay deck

### Phase 63: Settings deck layout revamp

**Goal:** Reorder brightness controls and add version icon per the specified layout.
**Requirements:** `SETTINGS-05`, `SETTINGS-06`, `SETTINGS-07`
**Depends on:** 53, 54
**Success criteria:**
- [ ] Brightness buttons in order: darker (n-3), brighter (n-2), percent (n-1)
- [ ] Version icon with sireno logo at position n-1, no border or background
- [ ] Brightness controls use `iconTextSurface`; percent button uses `<Label>`

### Phase 64: Chrome overlay deck extensions

**Goal:** Add more keystroke actions to the chrome overlay deck.
**Requirements:** `CHROME-01`
**Depends on:** None
**Success criteria:**
- [ ] Chrome overlay deck has buttons for: unclose tab (Ctrl+Shift+T), incognito (Ctrl+Shift+N)
- [ ] All chrome deck buttons use the `action` button type with `key_macro` or command-based keystroke execution

### Phase 65: v1.6 verification sweep

**Goal:** A single focused verification phase proving all v1.6 features work together.
**Requirements:** `VERIFY-02`
**Depends on:** 58, 59, 60, 61, 62, 63, 64
**Success criteria:**
- [ ] Back button <200ms test evidence
- [ ] Emoji keystroke injection test on at least one OS
- [ ] Pagination 3-line rendering test
- [ ] Icon change assertions
- [ ] Overlay autoShow behavior tests
- [ ] Settings deck layout tests
- [ ] Chrome deck keystroke tests
- [ ] All existing v1.5 tests still pass

### Phase 66: SplitActionSurface

**Goal:** Replace `SystemBackButton`, `SystemBackWithPendingOverlayButton`, and the `SystemSettingsEntryButton` badge pattern with a single `SplitActionSurface` component that renders primary/secondary sub-surfaces in a diagonal `/` split, with tap/dbl-tap dispatching to the correct action.
**Requirements:** `ACTIVEAPP-08` (refined)
**Depends on:** 62
**Status:** ✓ Executed (2026-06-15) — both plans complete; one documented implementation deviation (`flex-col` + decorative `<hr -rotate-45>` instead of `clip-path: polygon()` for the diagonal visual). See `66-01-SUMMARY.md` and `66-02-SUMMARY.md`.

### Plans
- 66-01 — SplitActionSurface component (with theme override + tests) — shipped via commit 8319f42
- 66-02 — System button migration (dispatcher + runtime + deletion of old components) — shipped via commit 8319f42

## Coverage Validation

| Requirement | Phase | Status |
|-------------|-------|--------|
| RES-01 | 57 | pending |
| RES-02 | 57 | pending |
| RES-03 | 57 | pending |
| PERF-01 | 58 | pending |
| PERF-02 | 58 | pending |
| PERF-03 | 58 | pending |
| EMO-15 | 59 | pending |
| EMO-16 | 59 | pending |
| EMO-17 | 59 | pending |
| PAG-02 | 60 | pending |
| PAG-03 | 60 | pending |
| ICON-01 | 61 | pending |
| ACTIVEAPP-08 | 61 | pending |
| ACTIVEAPP-07 | 62 | pending |
| ACTIVEAPP-07a | 62 | pending |
| ACTIVEAPP-07b | 62 | pending |
| SETTINGS-05 | 63 | pending |
| SETTINGS-06 | 63 | pending |
| SETTINGS-07 | 63 | pending |
| CHROME-01 | 64 | pending |
| VERIFY-02 | 65 | pending |
**Total:** 21/21 v1.6 requirements mapped, 0 circular dependencies.

## Build Order Rationale

- **Phase 57 (research)** comes first because the back button delay root cause and emoji injection approach are unknown — without the research, the fix phases (58, 59) can't be properly scoped.
- **Phase 58 (performance fixes) depends on 57** — the fixes come from the research findings.
- **Phase 59 (emoji fixes) depends on 57** — the keystroke simulation approach is decided in research.
- **Phase 60 (pagination button)** is independent and can run in parallel with 61-62 in theory, but is sequenced before icon/overlay work since the pagination button appears on overlay pages.
- **Phase 61 (icon updates)** is pure cosmetic and independent of everything except existing icon availability.
- **Phase 62 (overlay autoShow) depends on Phase 55** (the overlay system from v1.5) and on Phase 57 (understanding the back button timing for the 2xTap summon).
- **Phase 63 (settings deck revamp) depends on Phase 53/54** (brightness API and settings deck from v1.5).
- **Phase 64 (chrome deck)** is a config-only extension, independent of all other v1.6 phases.
- **Phase 65 (verification)** is the cross-cutting regression sweep at the end.
- **Phase 66 (DynamicActionsButton)** depends on Phase 62's overlay autoShow and replaces the bespoke pending-overlay button variants with a reusable dual-surface helper.

## Phase Sizing

| Phase | Estimated plans | Estimated sessions | Notes |
|-------|-----------------|-------------------|-------|
| 57 — Research | 1 | 1 | Profiling + emoji injection approach |
| 58 — Performance fixes | 1 | 1 | Depends on research findings |
| 59 — Emoji keystroke injection | 1-2 | 1 | Fix + cross-platform test |
| 60 — Pagination button redesign | 1 | 1 | Small focused UI change |
| 61 — Icon updates | 1 | 1 | Pure cosmetic, two icon swaps |
| 62 — Overlay autoShow | 1-2 | 1-2 | New config + back button variant |
| 63 — Settings deck revamp | 1 | 1 | Layout reorder + icon swap |
| 64 — Chrome overlay deck | 1 | 1 | Config-only, add button actions |
| 65 — Verification | 1 | 1 | Regression sweep |
| 66 — DynamicActionsButton | 1 | 1 | Dual-surface system button helper |
**Total:** 10 phases, ~10-13 plans, ~10-13 sessions.

## Anti-Features Carried Forward (kept out of v1.6)

- Distribution build pipeline (Phases 40/47/48) — pending distribution target decision
- CI matrix builds for Linux + Mac — manual testing only
- Auto-brightness based on ambient light or time of day
- Active-app decks on pure Wayland sessions
- Configurable back-button double-tap threshold
- Bumping `SIRENO_ADDON_API_VERSION`

---

*Roadmap created: 2026-06-11*
*Total v1.6 phases: 9, total requirements: 21*
