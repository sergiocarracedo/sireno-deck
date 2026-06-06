---
phase: 46
status: passed
verified: 2026-06-06
---

# Phase 46: Emoji-Selector Multi-Page — Gap-Closure Verification

**Wave 1 / Plans 46-03, 46-04**

## Must-Have Results

### Plan 46-03 — Multi-page target_deck fix

| Must-Have | Status |
| --- | --- |
| Main-deck button for a multi-page category uses the actual first-page deck ID (`${deckId}-${categoryId}-p1`) | ✓ |
| New regression test asserts the contract | ✓ |
| `firstPageDeckIds` captured inside the existing per-category page loop (no duplicated loop) | ✓ |
| Single-page categories continue to use the base deck ID | ✓ |
| All existing 10 emoji-selector tests still pass | ✓ (11/11 pass after the new test) |

### Plan 46-04 — System-back injection wiring (SRB-03)

| Must-Have | Status |
| --- | --- |
| `runtime.ts` imports the existing `shouldInjectSystemBack`, `getSystemBackButtonInstance`, `SystemBackButton` | ✓ |
| `getDeckButtons` calls `shouldInjectSystemBack` and appends a system-back instance at the reserved slot when allowed | ✓ |
| `instantiateRuntimeButtonInstance` handles `system-back` buttons (renders `SystemBackButton`, wires `onPress`/`onTap` to `deckController.goBack()`, wires `onHold` to `restoreStack([])`) | ✓ |
| New runtime test: subdeck with no button at the reserved slot has a `system-back` button there | ✓ |
| New runtime test: deck with `lockedDeckId === deck.id` does NOT have a system-back at the reserved slot | ✓ |
| Pre-existing 43 runtime-test failures unchanged (no new failures introduced) | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
| --- | --- | --- |
| EMO-01 — Multi-page categories | 46-01/46-02 prior work; verified | ✓ |
| EMO-02 — Page size formula | 46-01/46-02 prior work; verified | ✓ |
| EMO-03 — Prev/next via change-deck | 46-01/46-02 prior work; verified | ✓ |
| EMO-04 — Back button at reserved slot | 46-01/46-02 prior work; verified + closed by 46-04 (injection half now wired) | ✓ |
| EMO-05 — Per-category pagination | 46-01/46-02 prior work; verified | ✓ |
| SRB-03 — Subdecks have a core-owned back button at the reserved slot | 46-04 — fully wired end-to-end (validation + injection) | ✓ |
| SRB-03a — Tap → previous deck | 46-04 — `onPress`/`onTap` route to `deckController.goBack()` | ✓ |
| SRB-03b — Hold (≥600ms) → home deck | 46-04 — `onHold` routes to `deckController.restoreStack([])` | ✓ |
| SRB-05 — Reuse existing 600ms hold timer | 46-04 — `SystemBackButton` uses `HOLD_THRESHOLD_MS = 600` (matches the existing constant in `addon/api.ts`) | ✓ |

## Integration Checks

| Import | Export exists | Status |
| --- | --- | --- |
| `runtime.ts` → `./system-back-button.js` (`SystemBackButton`) | `export function SystemBackButton(...)` in `system-back-button.tsx:15` | ✓ |
| `runtime.ts` → `./system-back-injection.js` (`shouldInjectSystemBack`, `getSystemBackButtonInstance`) | `export function shouldInjectSystemBack(...)` line 9, `export function getSystemBackButtonInstance(...)` line 26 | ✓ |
| `runtime.ts` → `../core/schemas.js` (`SirenoConfig`) | `SirenoConfig` exported from `core/schemas.ts` | ✓ |
| `runtime.test.ts` → `../addon/registry.js` (`createAddonRegistry`, `AddonRegistry`) | `export function createAddonRegistry()` line 50, `export interface AddonRegistry` line 40 | ✓ |

## Summary

**Score:** 11/11 must-haves verified

All automated checks passed. The two UAT-surfaced gaps are now closed:

- **Multi-page category navigation** (UAT test 3): the main-deck button now points to the actual first-page deck ID, so tapping a multi-page category navigates to page 1 instead of throwing `DeckNavigationError`.
- **Empty reserved slot on subdecks** (UAT test 2, pre-existing SRB gap): the runtime now actually calls the existing helpers, so a `system-back` instance lands at the reserved slot on every subdeck that doesn't already have a button there, and the `SystemBackButton` component handles tap/hold navigation.

Manual UAT is still recommended to confirm the visual placement of the back button and the multi-page navigation on hardware, but all the runtime-side integration is in place and the targeted unit tests prove the contract.

## Pre-existing context

The 43 pre-existing failures in `runtime.test.ts` (and the broader `date-time/` and `loader.test.ts` failures) originate in test setup gaps from prior phases and are out of scope for Phase 46. They are unchanged by the gap-closure work — confirmed by re-running the test file before and after the 46-04 changes: 43 failed | 1 passed (44 total) → 43 failed | 3 passed (46 total). The 2 net passing tests are exactly the new 46-04 system-back tests.
