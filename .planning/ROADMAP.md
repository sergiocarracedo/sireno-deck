# Roadmap — Sireno Deck

**Version:** v1.7 — Polish & 3rd-Party Fixtures
**Milestone goal:** Close the seam-level bugs that survived v1.6 verification (gesture timing, pasteText semantics, system-buttons dispatcher, deck icon plumbing, macro error surfacing, bars formatting) and ship a new multi-value builtin addon. Land the first real 3rd-party fixtures (addon + theme) that exercise the loader seams as a real external author would and document the trust model honestly.
**Last updated:** 2026-06-17

## Milestone Summary

v1.7 starts where v1.6 verification left off: the v1.6 sweep marked 21/21 requirements satisfied, but real use surfaced 7 seam-level bugs (gesture delays, broken paste, swallowed macro errors, ignored deck icons, hardcoded formatters) and 1 missing feature (a multi-value addon for users who need 3+ live values on one button). The v1.7 ordering is **fix the seams first, then add the new addon, then prove the seams hold for 3rd parties** — gestures → system-buttons → keystroke injection → formatter/layout → new builtin → fixtures → verification.

**Key v1.6 carryovers addressed in v1.7:**
- EMO-15 (v1.6 claimed `pasteText` simulates the OS paste keystroke — the code never actually did). BUG-05 closes the gap.
- PERF-01 was measured on the wrong transition (back-pop, not settings-landing). BUG-01 re-measures on real hardware.
- The deck `icon` field is accepted by the YAML schema but dropped at the loader seam. BUG-04 fixes the seam.
- `keyMacroProvider` Linux path silently swallows `xdotool` failures. BUG-06 surfaces them.

**No new npm dependencies. No `SIRENO_ADDON_API_VERSION` bump.** The 3rd-party fixtures (3RD-01, 3RD-02) live at the absolute paths the user specified (`/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme`) — they exercise the loader as a real external author would, not as an in-repo test fixture.

## Phases

### Phase 71: Gesture state machine hardening

**Goal:** Fix the perceived 400ms system-back delay (real-hardware profile) and make double-tap semantics strict.
**Requirements:** `BUG-01`, `BUG-02`
**Depends on:** None
**Status:** ⏳ Pending discuss-phase
**Success criteria:**
- [ ] Real-hardware profile trace of the settings-deck → previous-deck landing transition identifies the slowest hop (gesture handler, navigate-back, surface activation, render emit, browser capture)
- [ ] Back button transition completes in <200ms on real hardware (Linux)
- [ ] Gesture handler waits the full `DOUBLE_TAP_DELAY_MS` window before declaring a single-tap when only `onTap` is configured
- [ ] Second press within `DOUBLE_TAP_DELAY_MS` of a first press suppresses BOTH `onTap` and `onDblTap` when no `onDblTap` is registered
- [ ] Combined regression test covers: single-tap, double-tap, no-callback-dbltap, hold-during-tap-window
- [ ] No regressions in any existing test suite

### Phase 72: System-buttons dispatcher + deck icon ✓

**Goal:** Wire the 2-line `SplitActionSurface` variant for `autoShow: false` with history-aware back semantics; plumb the deck `icon` field end-to-end.
**Requirements:** `BUG-03`, `BUG-04`
**Depends on:** None
**Status:** ✓ Complete (2026-06-17)
**Success criteria:**
- [x] `CoreDeckConfigSchema` accepts an optional `icon?: string` field
- [x] `parseRawDeck` preserves the `icon` field through to runtime
- [x] `OverlayToggleButton` renders the deck `icon` (from the addon manifest or the deck config) next to `send-to-back`
- [x] When an active-app overlay deck has `autoShow: false`, the base deck's reserved back position renders the 2-line `SplitActionSurface` variant
- [x] 2xTap action on that variant walks the underlying base deck's history stack: if the overlay is at the root of its own history, equivalent to `dismissOverlay()`; otherwise pops the overlay's own page history first
- [x] Dispatcher has access to both stacks (overlay and base)
- [x] No regressions in active-app overlay flow with `autoShow: true` (default)

**Gap closure:** 3 UAT gaps were identified (Gaps 1-2: `icon://` prefix documented as Lucide name, not custom logo; Gap 3: 2-line SplitActionSurface trigger conditions documented). All three gaps closed as documentation-only — no code changes needed. Relevant docs: README.md, packages/cli/README.md, .planning/REQUIREMENTS.md.

### Phase 73: Paste semantics + macro error surfacing

**Goal:** Make `pasteText` actually paste; make `keyMacroProvider` failures loud.
**Requirements:** `BUG-05`, `BUG-06`
**Depends on:** None
**Status:** ✅ Executed (2026-06-17)
**Success criteria:**
- [x] `methods.pasteText(text)` writes to clipboard AND simulates the OS paste keystroke (Ctrl+V / Cmd+V)
- [x] Function name `pasteText` preserved (no rename)
- [ ] EMO-15/EMO-16/EMO-17 verification updated: `pasteText` is now an alias for "write + simulate paste" and the v1.6 verification gap is closed
- [x] `keyMacroProvider` Linux path: `xdotool` exit non-zero is surfaced through the existing runtime-button-error helper with the button context (config, action type, command)
- [ ] `keyMacroProvider` macOS path: `osascript` failure surfaced the same way
- [ ] `keyMacroProvider` Windows path: `SendKeys` rejection surfaced the same way
- [ ] The current `// Non-fatal` swallow in `linux.ts:91-93` is removed
- [ ] At least one cross-platform test verified end-to-end (the runtime path, not the unit seam)

### Phase 74: Label-values cap (BUG-07 dropped via discussion)

**Goal:** Cap `system-status-label-values` at 2 values (3+ → schema error pointing to `value-display`). BUG-07 (Bars formatter) deferred — existing displayValue path covers the use case.
**Requirements:** `FEAT-01` (BUG-07 deferred)
**Depends on:** None
**Status:** ✓ Executed (2026-06-18)
**Success criteria:**
- [x] `system-status-label-values` schema caps `metrics` at 1-2 entries (`z.array(...).min(1).max(2, "msg")`)
- [x] 3+ value configs are rejected at config load with a clear error pointing to `value-display` (FEAT-02)
- [x] All existing `system-status-label-values` configs (1-2 metrics) in tests still pass
- [x] `system-status-bars` schema is unchanged (still allows 1-3 metrics)
- [x] BUG-07 (Bars formatter prop) — deferred; existing displayValue + SystemStatusFormatter vocabulary covers the use case

### Phase 75: New `value-display` builtin addon

**Goal:** Ship a new first-party addon that renders 1–3 values from per-value shell commands with shared `SystemStatusFormatter` vocabulary and full action wiring.
**Requirements:** `FEAT-02`
**Depends on:** 74 (shares `SystemStatusFormatter` vocabulary)
**Status:** ⏳ Pending discuss-phase
**Success criteria:**
- [ ] New addon at `packages/cli/src/builtin-addons/value-display/` with a `sirenoAddon` export and a button type `value-display`
- [ ] Zod schema accepts 1, 2, or 3 value entries with: `command` (required, returns value as stdout), `label` (required), `icon?`, `formatter?` (reuses `SystemStatusFormatter`), `units?`
- [ ] Layout auto-selects for 1, 2, or 3 values (similar to `LabelValueList` 1/2/3-4 line layout)
- [ ] Action wiring uses `useButtonActionCommand` so `commands.tap | hold | double-tap` are configurable per button
- [ ] Bundled in the CLI as a first-party addon (no extra install step)
- [ ] Unit tests for: 1/2/3 value layouts, command-not-found, action commands fire on tap/dbltap/hold

### Phase 76: 3rd-party addon + theme fixtures

**Goal:** Land the first real 3rd-party addon and theme that exercise the loader seams as a real external author would.
**Requirements:** `3RD-01`, `3RD-02`
**Depends on:** 75 (so the 3rd-party addon can use `value-display` or other new builtins)
**Status:** ⏳ Pending discuss-phase
**Success criteria:**
- [ ] `/works/test/test-sireno-deck/` exists as a 3rd-party addon with its own `package.json`, `sirenoAddon` export, button type(s), and deck(s)
- [ ] The addon declares `apiVersion: 1`
- [ ] Includes a custom button type (e.g. solid-color cycling button — cycles through 30+ named colors once per second)
- [ ] Includes a deck of 30+ action buttons, each rendering a color swatch + name and pasting the corresponding `#rrggbb` hex code on tap
- [ ] Configured in `config.yml` and renders correctly with the active theme
- [ ] `/works/test/test-sireno-deck-theme/` exists as a 3rd-party theme with yellow-based color tokens
- [ ] Theme replaces all UI components (background, accent, text, button frame, surface) with alternative token set
- [ ] Theme README documents the v1 trust model honestly (trusted in-process, no sandbox)
- [ ] Addon README documents the same trust model
- [ ] Tests verify both load via the existing loader seams (`importRawSourceAddon`, `importThemeRuntime`)

### Phase 77: v1.7 verification sweep

**Goal:** Aggregate evidence from all v1.7 phases, run the full targeted test sweep, write `77-VERIFICATION.md`, realign requirements/roadmap metadata.
**Requirements:** `VERIFY-03`
**Depends on:** 71, 72, 73, 74, 75, 76
**Status:** ⏳ Pending discuss-phase
**Success criteria:**
- [ ] Single `77-VERIFICATION.md` aggregates evidence from 7 in-scope phases (71-76 + 77)
- [ ] 7/7 ROADMAP success criteria + 7/7 VERIFY-03 sub-criteria + 11/11 v1.7 requirements traced
- [ ] Targeted vitest sweep with documented baseline failures
- [ ] Hardware caveat documented for any real-hardware-only requirement (BUG-01)
- [ ] REQUIREMENTS.md and ROADMAP.md Coverage Validation table updated
- [ ] PROJECT.md "Latest Shipped Milestone" field set to v1.7 with achievements list

## Phase Dependency Graph

```
71 (gestures) ──────────────────────┐
72 (system-buttons) ────────────────┤
73 (paste/macro) ───────────────────┤
74 (formatter) ──┐                  │
75 (value-display) ←── 74 ──────────┤
76 (3rd-party) ←── 75 ──────────────┤
77 (verification) ←── 71,72,73,74,75,76
```

Phases 71–74 are independent and can be parallelized at the plan level. Phase 75 depends on 74 (`SystemStatusFormatter` vocabulary). Phase 76 depends on 75 (so the 3rd-party addon can use new builtins). Phase 77 depends on all six.

## Coverage Validation

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | 71 | satisfied (ver: 71-01) |
| BUG-02 | 71 | satisfied (ver: 71-02) |
| BUG-03 | 72 | satisfied (ver: 72-02) |
| BUG-04 | 72 | satisfied (ver: 72-01) |
| BUG-05 | 73 | pending |
| BUG-06 | 73 | pending |
| BUG-07 | 74 | pending |
| FEAT-01 | 74 | pending |
| FEAT-02 | 75 | pending |
| 3RD-01 | 76 | pending |
| 3RD-02 | 76 | pending |
| VERIFY-03 | 77 | pending |

---

*Roadmap defined: 2026-06-17*
*Total v1.7 phases: 7 (71-77)*
*Total v1.7 requirements: 11*
