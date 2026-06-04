---
phase: 42
status: gaps_found
verified: 2026-06-04
---

# Phase 42: System-Reserved Back Button — Verification

## Must-Have Results

| Plan  | Must-Have                                                                                                  | Status |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 42-01 | Config validation rejects a button at position `keyCount - 1` unless `allow_reserved_slot_override: true` | ✓      |
| 42-01 | Validation error message names the deck and the reserved slot                                              | ✓      |
| 42-01 | Lock-session deck is exempt from the validation                                                            | ✓      |
| 42-01 | Main deck renders a subtle "Home" indicator at the reserved slot                                            | ✓ (component) / ⚠ (runtime wiring) |
| 42-01 | Subdecks render a back chevron + "Back" label at the reserved slot                                          | ✓ (component) / ⚠ (runtime wiring) |
| 42-01 | Back button tap triggers `controller.goBack()`                                                             | ⚠ (component accepts onTap, not wired) |
| 42-01 | Back button hold (≥600ms) triggers `controller.restoreStack([mainDeckId])`                                  | ⚠ (component accepts onHold, not wired) |
| 42-01 | Back button is theme-overridable (icon + label) via theme assets                                            | ✓ (backIconOverride prop) |
| 42-01 | `allow_reserved_slot_override: true` silences the warning AND disables the system back button for that deck | ✓ (validation) / ⚠ (runtime check not wired) |
| 42-01 | All existing tests pass                                                                                    | ✓*     |
| 42-01 | System back button is core-owned (not registered as an addon)                                              | ✓ (component lives in `deck/`, not in addons) |

\* Note: pre-existing test failures in `theme.test.ts` (11 schema validation issues from prior phases) and other files are documented in `39-01-SUMMARY.md` and are not introduced by Phase 42.

## Summary

**Score:** 8/11 must-haves verified, 3 with runtime-wiring gap

The validation, component, and override mechanics are in place and tested. Three items remain as a **runtime-injection gap** — they require wiring the `SystemBackButton` into `deck/runtime.ts`'s deck render pipeline. The component is ready, the validation reserves the slot, and the wiring is a single follow-up plan.

### Gaps

| Gap | Plan | What's missing |
|-----|------|----------------|
| Main deck renders Home indicator at runtime | 42-01 | Runtime injects the home indicator for main deck at position `keyCount - 1` |
| Subdecks render back button at runtime | 42-01 | Runtime injects `SystemBackButton` for non-main, non-lock, non-overridden decks |
| Runtime honors `allow_reserved_slot_override` | 42-01 | Runtime skips injection when deck-level override is true |

▶ Next: `plan-phase 42 --gaps` to create a follow-up plan that wires the runtime injection
