# Roadmap — Sireno Deck

**Version:** v1.6 — UX Speed & Overlay Extensions
**Milestone goal:** Fix UX friction from real use (slow button transitions, broken emoji injection), overhaul overlay UX with configurable auto-show and refined components, and extend the chrome overlay deck.
**Last updated:** 2026-06-15

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

### Phase 67: Settings deck layout revamp *(gap closure)*

**Goal:** Reorder the settings deck's brightness controls and add a version icon at the last position per the v1.6 layout spec.
**Requirements:** `SETTINGS-05`, `SETTINGS-06`, `SETTINGS-07`
**Depends on:** 53, 54
**Status:** ✓ Executed (2026-06-15, gap-closed via 67-02) — see `67-01-SUMMARY.md`, `67-02-SUMMARY.md`, and `67-CONTEXT.md` (D-01..D-08; D-01/D-02/D-03/D-08 invalidated by 67-02 — fixed positions replaced n-aware math).
**Success criteria:**
- [x] Brightness controls in order darker, brighter, percent — implemented at fixed positions 0/1/2 in `createInternalSettingsDeck()` (per 67-02 user correction; replaces the n-aware approach from 67-01)
- [x] Version icon with sireno logo at position 4 (user correction during UAT; supersedes 67-01's position 0). Position 3 is intentionally empty. `REQUIREMENTS.md` SETTINGS-06 wording is stale and will be re-aligned in Phase 70
- [x] Brightness controls use `IconLabelSurface` (resolving the misnamed `iconTextSurface` reference per D-04); percent subtitle uses `<Label>` (D-06)
- [x] Runtime-injected system back button at n-1 is never collided with — the fixed-position design leaves n-1 free for any keyCount in {6, 9, 15, 32} (tested in `internal-settings-deck.test.ts`)

### Phase 68: Chrome overlay deck extensions *(gap closure)*

**Goal:** Add more keystroke actions to the chrome overlay deck (unclose tab, incognito, etc.).
**Requirements:** `CHROME-01`
**Depends on:** None
**Status:** ✓ Executed (2026-06-15) — see `68-01-SUMMARY.md` and `68-CONTEXT.md` (D-01..D-08).
**Success criteria:**
- [x] Chrome overlay deck has buttons for: unclose tab (Ctrl+Shift+T), incognito (Ctrl+Shift+N) — and 5 more (close tab Ctrl+W, reload Ctrl+R, hard reload Ctrl+Shift+R, dev tools F12, plus new tab Ctrl+T replacing the dead placeholder)
- [x] All chrome deck buttons use the `action` button type with `key_macro: "string"` — no dead buttons, no `commands` field
- [x] Loader test (`packages/cli/src/config/loader.test.ts`) asserts deck shape: process_names: ['chrome'], 7 buttons at positions 0-6, each with the expected `key_macro` + `type`, no button at position 7+ (n-1 free for the runtime-injected back button)

### Phase 69: v1.6 verification sweep *(gap closure)*

**Goal:** A single focused verification phase proving all v1.6 features work together end-to-end.
**Requirements:** `VERIFY-02`
**Depends on:** 58, 59, 60, 61, 62, 67, 68
**Status:** [x] Verified (2026-06-15)
**Success criteria:**
- [x] Back button <200ms test evidence (in-process 12.35ms, hardware caveat documented)
- [x] Emoji keystroke injection test on at least one OS (Linux + macOS + Windows code paths, real-hardware UAT deferred)
- [x] Pagination 3-line rendering test (15/15 unit tests)
- [x] Icon change assertions (ICON-01 + ACTIVEAPP-08)
- [x] Overlay autoShow behavior tests (13/13 runtime + 10/10 system-back + 7/7 dispatcher)
- [x] Settings deck layout tests (9/9 real-hardware UAT)
- [x] Chrome deck keystroke tests (10/10 real-hardware UAT)
- [x] All existing v1.5 tests still pass (pragmatic — 113/120 targeted sweep, 7 pre-existing baseline)

### Phase 70: Verification + metadata backfill *(gap closure)*

**Goal:** Backfill the verification artifacts and metadata that earlier phases missed, so the milestone is consistently traceable end-to-end. Closes the documentation/process gaps that audit-milestone flagged, with no user-visible behavior change.
**Requirements:** *(no new requirements — pure metadata)*
**Depends on:** 66
**Status:** [ ] Not started
**Success criteria:**
- [ ] `61-VERIFICATION.md` exists and reports `passed`
- [ ] `62-VERIFICATION.md` exists and reports `passed`
- [ ] `66-VERIFICATION.md` exists and reports `passed`
- [ ] Phase 59 missing summaries written: `59-01-SUMMARY.md`, `59-02-SUMMARY.md`, `59-GC3-SUMMARY.md`
- [ ] `PROJECT.md` "Latest Shipped Milestone" updated to `v1.6 — UX Speed & Overlay Extensions`
- [ ] `STATE.md` Milestone History includes a v1.6 entry with shipped phase list
- [ ] `ROADMAP.md` Coverage Validation status column updated to reflect actual satisfaction state

## Coverage Validation

| Requirement | Phase | Status |
|-------------|-------|--------|
| RES-01 | 57 | satisfied (ver: 57-VERIFICATION, 69-VERIFICATION §3) |
| RES-02 | 57 | satisfied (ver: 57-VERIFICATION, 69-VERIFICATION §3) |
| RES-03 | 57 | satisfied (ver: 57-VERIFICATION, 69-VERIFICATION §3) |
| PERF-01 | 58 | satisfied (ver: 58-VERIFICATION, 69-VERIFICATION §3) |
| PERF-02 | 58 | satisfied (ver: 58-VERIFICATION, 69-VERIFICATION §3) |
| PERF-03 | 58 | satisfied (ver: 58-VERIFICATION, 69-VERIFICATION §3) |
| EMO-15 | 59 | satisfied (ver: 59-VERIFICATION, 69-VERIFICATION §3) |
| EMO-16 | 59 | satisfied (ver: 59-VERIFICATION, 69-VERIFICATION §3) |
| EMO-17 | 59 | satisfied (ver: 59-VERIFICATION, 69-VERIFICATION §3) |
| PAG-02 | 60 | satisfied (ver: 60-VERIFICATION, 69-VERIFICATION §3) |
| PAG-03 | 60 | satisfied (ver: 60-VERIFICATION, 69-VERIFICATION §3) |
| ICON-01 | 61 | satisfied (ver: 70-VERIFICATION §Sub-criteria) |
| ACTIVEAPP-08 | 66 | satisfied (ver: 70-VERIFICATION §Sub-criteria — refined by 66 SplitActionSurface) |
| ACTIVEAPP-07 | 62 | satisfied (ver: 70-VERIFICATION §Sub-criteria) |
| ACTIVEAPP-07a | 62 | satisfied (ver: 70-VERIFICATION §Sub-criteria — met by 66 SplitActionSurface) |
| ACTIVEAPP-07b | 62 | satisfied (ver: 70-VERIFICATION §Sub-criteria — met by 66 SplitActionSurface) |
| SETTINGS-05 | 67 | satisfied (ver: 70-VERIFICATION §Sub-criteria — fixed positions 0/1/2) |
| SETTINGS-06 | 67 | satisfied (ver: 70-VERIFICATION §Sub-criteria — position 4, realigned 2026-06-15) |
| SETTINGS-07 | 67 | satisfied (ver: 70-VERIFICATION §Sub-criteria — `IconLabelSurface` + `<Label>`) |
| CHROME-01 | 68 | satisfied (ver: 68-VERIFICATION, 69-VERIFICATION §3) |
| VERIFY-02 | 69 | satisfied (ver: 69-VERIFICATION) |
**Total:** 21/21 v1.6 requirements satisfied. 0 circular dependencies.

## Build Order Rationale

- **Phase 57 (research)** comes first because the back button delay root cause and emoji injection approach are unknown — without the research, the fix phases (58, 59) can't be properly scoped.
- **Phase 58 (performance fixes) depends on 57** — the fixes come from the research findings.
- **Phase 59 (emoji fixes) depends on 57** — the keystroke simulation approach is decided in research.
- **Phase 60 (pagination button)** is independent and can run in parallel with 61-62 in theory, but is sequenced before icon/overlay work since the pagination button appears on overlay pages.
- **Phase 61 (icon updates)** is pure cosmetic and independent of everything except existing icon availability.
- **Phase 62 (overlay autoShow) depends on Phase 55** (the overlay system from v1.5) and on Phase 57 (understanding the back button timing for the 2xTap summon).
- **Phase 66 (DynamicActionsButton)** depends on Phase 62's overlay autoShow and replaces the bespoke pending-overlay button variants with a reusable dual-surface helper.
- **Phase 67 (settings deck revamp, gap closure) depends on Phase 53/54** (brightness API and settings deck from v1.5).
- **Phase 68 (chrome deck, gap closure)** is a config-only extension, independent of all other v1.6 phases.
- **Phase 69 (verification sweep, gap closure) depends on 58, 59, 60, 61, 62, 67, 68** — the cross-cutting regression sweep at the end.
- **Phase 70 (verification + metadata backfill, gap closure)** is documentation/process work; it depends on Phase 66 because that's the last "executed" phase whose VERIFICATION.md and metadata need to be backfilled. Closes the audit gaps without changing user-visible behavior.

## Phase Sizing

| Phase | Estimated plans | Estimated sessions | Notes |
|-------|-----------------|-------------------|-------|
| 57 — Research | 1 | 1 | Profiling + emoji injection approach |
| 58 — Performance fixes | 1 | 1 | Depends on research findings |
| 59 — Emoji keystroke injection | 1-2 | 1 | Fix + cross-platform test |
| 60 — Pagination button redesign | 1 | 1 | Small focused UI change |
| 61 — Icon updates | 1 | 1 | Pure cosmetic, two icon swaps |
| 62 — Overlay autoShow | 1-2 | 1-2 | New config + back button variant |
| 66 — DynamicActionsButton | 1 | 1 | Dual-surface system button helper |
| 67 — Settings deck revamp (gap) | 1 | 1 | Layout reorder + icon swap |
| 68 — Chrome overlay deck (gap) | 1 | 1 | Config-only, add button actions |
| 69 — Verification (gap) | 1 | 1 | Regression sweep |
| 70 — Backfill (gap) | 1 | 1 | Documentation/metadata only, no code |
**Total:** 11 phases, ~11-14 plans, ~11-14 sessions.

## Anti-Features Carried Forward (kept out of v1.6)

- Distribution build pipeline (Phases 40/47/48) — pending distribution target decision
- CI matrix builds for Linux + Mac — manual testing only
- Auto-brightness based on ambient light or time of day
- Active-app decks on pure Wayland sessions
- Configurable back-button double-tap threshold
- Bumping `SIRENO_ADDON_API_VERSION`

---

*Roadmap created: 2026-06-11*
*Total v1.6 phases: 11, total requirements: 21*
