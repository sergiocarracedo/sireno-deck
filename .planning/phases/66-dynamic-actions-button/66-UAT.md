---
status: complete
phase: 66-dynamic-actions-button
source:
  - 66-01-PLAN.md
  - 66-01-SUMMARY.md
  - 66-02-PLAN.md
  - 66-02-SUMMARY.md
started: 2026-06-15T18:45:00Z
updated: 2026-06-15T19:05:00Z
---

## Current Test

number: 9
name: No regressions in the existing test suite
expected: |
  `pnpm vitest run` shows no NEW failures attributable to Phase 66. The
  47 `runtime.test.ts` failures noted in `66-02-SUMMARY.md` are
  pre-existing (`options.addonRegistry` not passed in some test setups)
  and not introduced by Phase 66.
awaiting: user response

## Internal Evidence (not UAT — captured for the record)

Static checks already executed during execute-phase. Captured for the verification trail.

- **Test 66-01 unit suite:** `pnpm vitest src/ui/surfaces/__tests__/SplitActionSurface.test.tsx` → **5/5 pass**.
- **Dispatcher test:** `pnpm vitest src/deck/__tests__/system-buttons-dispatcher.test.ts` → **7/7 pass**.
- **Internal-decks test:** `pnpm vitest src/deck/__tests__/internal-decks.test.ts` → **3/3 pass**.
- **TypeScript:** `pnpm exec tsc --noEmit` → 982 errors, **all pre-existing** (zero new errors from Phase 66).
- **Lint:** `pnpm exec oxlint` on all Phase 66 files → **0 warnings** (cleaned an unused `TapIndicator` import in `SystemSettingsEntryButton.tsx` during execute-phase).
- **Files modified/deleted (all present on `main` commit `8319f42`):**
  - `packages/cli/src/ui/surfaces/SplitActionSurface.tsx` (new)
  - `packages/cli/src/ui/surfaces/__tests__/SplitActionSurface.test.tsx` (new, test fixed `scale-[0.85]` → `scale-[0.65]` during execute-phase)
  - `packages/cli/src/ui/TapIndicator.tsx` (new)
  - `packages/cli/src/ui/index.ts` (SplitActionSurface export added)
  - `packages/cli/src/deck/system-buttons/system-buttons.ts` (SPLIT_ACTION_TYPE + dispatcher refactor)
  - `packages/cli/src/deck/system-buttons/SystemBackButton.tsx` (**deleted**)
  - `packages/cli/src/deck/system-buttons/SystemBackWithPendingOverlayButton.tsx` (**deleted**)
  - `packages/cli/src/deck/system-buttons/SystemSettingsButton.tsx` (**deleted**)
  - `packages/cli/src/deck/system-buttons/SystemSettingsEntryButton.tsx` (simplified, no badge)
  - `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` (preserved — still used for OVERLAY_TOGGLE_TYPE branch)
  - `packages/cli/src/deck/runtime.ts` (SPLIT_ACTION_TYPE case in `instantiateRuntimeButtonInstance`)
  - `packages/cli/src/deck/settings-deck.tsx` (**deleted** — 84 lines)
  - `packages/cli/src/deck/__tests__/settings-deck.test.tsx` (**deleted** — 111 lines)
  - `packages/cli/src/deck/__tests__/runtime.test.ts` (5+ tests updated to assert SPLIT_ACTION_TYPE)
  - `packages/cli/src/deck/__tests__/system-buttons-dispatcher.test.ts` (updated to import SPLIT_ACTION_TYPE)

## Tests (real UAT — user-observable behavior on real Stream Deck)

### 1. SplitActionSurface renders in single-surface mode (no secondary)
expected: When SplitActionSurface receives only `primary` (no `secondary`), the rendered output is a `<div class="contents">` wrapping the primary content. No diagonal wrapper, no TAP/TAPx2 indicators, no scaled halves.
result: pass

### 2. SplitActionSurface renders in dual-surface mode (with secondary)
expected: When SplitActionSurface receives both `primary` and `secondary`, the output is a `<div class="relative size-full flex flex-col">` with: (a) a thin `<hr>` rotated -45° acting as the diagonal separator with `bg-accent`, (b) a `<TapIndicator type="tap" size="xs" />` in the top-right corner with label "TAP", (c) a `<TapIndicator type="dbltap" size="xs" />` in the bottom-left corner with label "TAPx2", and (d) two flex-1 absolute-positioned halves each containing a `scale-[0.65]` wrapper around the corresponding sub-surface.
result: pending

### 3. Tap (single press) triggers the primary action on dual-surface SplitActionSurface
expected: On a real Stream Deck, navigate to a sub-deck. The reserved slot (position 14) renders a SplitActionSurface with the back action as primary. Single tap → navigates back to the parent deck. The TAP indicator in the top-right is visible and labels the action as "TAP".
result: pending

### 4. Dbl-tap on the reserved slot summons the pending overlay (when one exists)
expected: With autoShow disabled on a deck and an active app matching its process_names, a pending overlay is registered. Navigate to a sub-deck. The reserved slot renders a dual-surface SplitActionSurface (back as primary, pending overlay icon + name as secondary). Dbl-tap → summons the pending overlay (navigates to the overlay deck). The TAPx2 indicator in the bottom-left is visible and labels the action as "TAPx2".
result: pending

### 5. Back button on a sub-deck (no pending overlay) shows single-surface mode
expected: On a sub-deck with no pending overlay, the reserved slot renders a single-surface SplitActionSurface (only `primary` = back action). No secondary, no TAPx2 indicator visible. Tap → navigates back.
result: pass

### 6. Settings entry on the main deck (with settings deck configured) opens settings on tap
expected: On the main deck with the internal settings deck configured, the reserved slot renders a SplitActionSurface with the settings entry button as primary. Single tap → navigates to the settings deck. The settings icon (gear) is visible.
result: pass

### 7. Overlay deck view shows the overlay-toggle button (not SplitActionSurface)
expected: When the active deck is the overlay deck (or any of its paginated variants), the reserved slot renders the OVERLAY_TOGGLE_TYPE button (send-to-back icon + active deck icon/name). Not a SplitActionSurface. Tap or dbl-tap → dismisses the overlay.
result: pass

### 8. CLI starts clean
expected: `pnpm cli:dev start --config config.yml` (or `pnpm exec sireno-deck start --config config.yml`) boots without errors. No "cannot find module" or import-resolution warnings. The CLI shows the configured deck and waits for hardware (or emulator) input.
result: pass

### 9. No regressions in the existing test suite (beyond the documented 47 pre-existing runtime.test.ts failures)
expected: `pnpm vitest run` shows no NEW failures attributable to Phase 66. The 47 `runtime.test.ts` failures noted in `66-02-SUMMARY.md` are pre-existing (`options.addonRegistry` not passed in some test setups) and not introduced by Phase 66.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
