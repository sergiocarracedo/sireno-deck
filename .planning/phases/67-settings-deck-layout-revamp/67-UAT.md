---
status: testing
phase: 67-settings-deck-layout-revamp
source:
  - 67-01-PLAN.md
  - 67-01-SUMMARY.md
  - 67-02-PLAN.md
started: 2026-06-15T19:30:00Z
updated: 2026-06-15T20:00:00Z
paused: 2026-06-15T20:00:00Z
pause_reason: "User corrected the design during UAT (fixed positions 0/1/2/4 instead of n-aware). 67-02-PLAN.md created as gap closure. Resume UAT after 67-02 execute-phase + 67-02-SUMMARY."
---

## Current Test

number: 2
name: System back button is present on the settings deck (regression check)
expected: |
  The settings deck is a sub-deck of main. Before Phase 67, the runtime
  injected a system back button at position n-1 for any non-main deck.
  After Phase 67 the current_brightness button also lives at n-1, which
  means the back button is no longer reachable by the previous auto-
  injection logic. The user must still have a visible way to return to
  the main deck (e.g., the back button replaces current_brightness,
  moves to a different slot, or is rendered as a SplitActionSurface
  primary with the percent button as a non-colliding secondary).
awaiting: user response

## Internal Evidence (not UAT — captured for the record)

Static checks already executed during execute-phase. Captured for the verification trail.

- **Test 67-01 unit suite:** `cd packages/cli && pnpm vitest run src/builtin-addons/internal-settings/ src/deck/__tests__/internal-settings-deck.test.ts` → **26/26 pass** (1 addon-shape + 4 per-button + 7 new matrix + 14 transitive).
- **Table-driven matrix test:** keyCount in [6, 9, 15, 32] all produce correct {position, type} layout. Degenerate keyCount=4 produces positions [0,1,2,3]. keyCount in [1, 3] throws "keyCount >= 4".
- **TypeScript:** `pnpm exec tsc --noEmit` → 0 new errors from Phase 67 (pre-existing baseline unchanged).
- **Lint:** `pnpm exec oxlint` on touched files (IconLabelSurface, 3 internal-settings buttons, runtime.ts, new test) → 0 new warnings.
- **Atomic commits on main (range 71913b3..637ae89):**
  - `71913b3` — docs(67): create phase plans
  - `1124fa5` — docs: update AGENTS.md — planning phase 67
  - `30f0156` — feat(67): migrate settings brightness + current to IconLabelSurface/Label
  - `7398049` — feat(67): keyCount-driven internal settings deck + position matrix test
  - `16bf093` — docs(67): phase research
  - `637ae89` — docs(67): execute-phase summary + roadmap/state/agents updates
- **Files modified (6 total):**
  - `packages/cli/src/ui/surfaces/IconLabelSurface.tsx` (extended: `...rest` spread, consumer className appended)
  - `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-up.tsx` (migrated to IconLabelSurface)
  - `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-down.tsx` (migrated to IconLabelSurface)
  - `packages/cli/src/builtin-addons/internal-settings/buttons/current-brightness.tsx` (subtitle `<Label>`)
  - `packages/cli/src/deck/runtime.ts` (static `INTERNAL_SETTINGS_DECK` → `createInternalSettingsDeck(keyCount)`)
  - `packages/cli/src/deck/__tests__/internal-settings-deck.test.ts` (new, 7 cases)

## Tests (real UAT — user-observable behavior on real Stream Deck)

### 1. Settings deck places 4 buttons at positions {0, keyCount-3, keyCount-2, keyCount-1} for keyCount=15
expected: For keyCount=15, createInternalSettingsDeck(15) returns a DeckConfig with 4 buttons placed at positions exactly {0, 12, 13, 14}. The types at those positions are {logo_version, brightness_down, brightness_up, current_brightness}.
result: pass

### 2. Settings deck renders logo+version at position 0 (top-left, 15-key grid)
expected: On a 15-key Stream Deck, open the settings deck from the main deck (tap position-0 reserved slot from Phase 66). Position 0 (top-left) shows "sireno" + "v1" subtitle, in the same hand-rolled text style as before. Tapping it has no effect (display-only).
result: issue
reported: "current bight buttion it not visible, neither system back button. use these position: bright dec: 0, bright inc: 1, bright current: 2, version: 4"
severity: major
corrected_design:
  - Position 0: brightness_down (Dimmer)
  - Position 1: brightness_up (Brighter)
  - Position 2: current_brightness (N% + Brightness label)
  - Position 3: empty (intentional)
  - Position 4: logo_version (sireno v1)
  - Position n-1: reserved for runtime-injected system back button
notes: |
  The user's reported layout REJECTS the n-aware design from CONTEXT.md
  (decisions D-01/D-02/D-03/D-08) and the 67-01-PLAN.md Task 5
  (createInternalDecks keyCount math). The corrected design is FIXED
  positions 0/1/2/4 for any keyCount ≥ 4, leaving n-1 free for the
  runtime-injected system back button. This invalidates tests 1, 3, 4,
  5, 6, 7 (all built around the n-aware design).

### 3. Position n-1 shows current brightness as large percentage + "Brightness" label
expected: On a 15-key Stream Deck, position 14 (bottom-right) shows "{N}%" in large text + "Brightness" as a smaller label below. Both render and re-render at 1 Hz. Tapping the position has no effect (display-only).
result: pending

### 4. Position n-2 shows "Brighter" (sun icon) and tapping it increases brightness by 10%
expected: On a 15-key Stream Deck, position 13 shows a sun icon + "Brighter" label, rendered through IconLabelSurface (icon top, label below, theme-overridable). Tapping it: brightness steps up by 10% (e.g., 50% → 60%), capped at 100%. The current-brightness position reflects the new value within ~1s.
result: pending

### 5. Position n-3 shows "Dimmer" (moon icon) and tapping it decreases brightness by 10%
expected: On a 15-key Stream Deck, position 12 shows a moon icon + "Dimmer" label, rendered through IconLabelSurface. Tapping it: brightness steps down by 10% (e.g., 50% → 40%), floored at 10%. The current-brightness position reflects the new value within ~1s.
result: pending

### 6. Settings deck layout scales correctly for keyCount=6 (positions 0, 3, 4, 5)
expected: On a 6-key Stream Deck (e.g., Stream Deck Mini), open the settings deck. Positions are: 0 = logo+version, 3 = dimmer, 4 = brighter, 5 = percent. The 4 buttons cluster in the right half of the grid; positions 1-2 are empty.
result: pending

### 7. Settings deck layout scales correctly for keyCount=32 (positions 0, 29, 30, 31)
expected: On a 32-key Stream Deck XL, open the settings deck. Positions are: 0 = logo+version (top-left of the grid), 29 = dimmer, 30 = brighter, 31 = percent (bottom-right of the grid). Other 28 positions are empty.
result: pending

### 8. CLI starts clean
expected: `cd packages/cli && pnpm cli:dev start --config config.yml` boots without errors. No "cannot find module" or import-resolution warnings. The CLI shows the configured deck and waits for hardware (or emulator) input.
result: pending

### 9. No regressions in the existing test suite (beyond the documented 47 pre-existing runtime.test.ts failures)
expected: `cd packages/cli && pnpm vitest run` shows no NEW failures attributable to Phase 67. The 47 pre-existing `runtime.test.ts` failures (options.addonRegistry plumbing) remain unchanged.
result: pending

## Summary

total: 9
passed: 1
issues: 1
pending: 7
skipped: 0

NOTE: Tests 1, 3, 4, 5, 6, 7 are now invalidated by the corrected
design. Tests 8, 9 are design-independent. Recommend pausing UAT
until the corrected design is implemented (follow-up fix plan).

## Gaps

- truth: "User can see and use all settings buttons (dec, inc, percent, version) plus the system back button"
  status: failed
  reason: "User reported: current bight buttion it not visible, neither system back button. use these position: bright dec: 0, bright inc: 1, bright current: 2, version: 4"
  severity: major
  test: 2
  corrected_design:
    - Position 0: brightness_down (Dimmer)
    - Position 1: brightness_up (Brighter)
    - Position 2: current_brightness (N% + Brightness label)
    - Position 3: empty (intentional)
    - Position 4: logo_version (sireno v1)
    - Position n-1: reserved for runtime-injected system back button (no collision)
  invalidates:
    - "67-CONTEXT.md decisions D-01 (logo@0), D-02 (SETTINGS-06 rephrase), D-03 (keyCount-aware), D-08 (n-3/n-2/n-1 brightness cluster)"
    - "67-01-PLAN.md Task 5 (createInternalDecks keyCount math, throws on keyCount<4)"
    - "67-01-PLAN.md must_haves truths about 'for keyCount=15, positions are 0, 12, 13, 14'"
    - "67-UAT tests 1, 3, 4, 5, 6, 7 (all based on n-aware layout)"
  follow_up: "Create a fix plan in a new phase (or as gap-closure on Phase 67) that changes createInternalSettingsDeck to fixed positions 0/1/2/4, drops the keyCount<4 throw, removes the n-aware matrix test, and replaces it with a fixed-position assertion."
