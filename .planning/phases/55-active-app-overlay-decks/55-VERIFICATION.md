---
phase: 55
status: passed
verified: 2026-06-09
---

# Phase 55: Active-app overlay decks — Verification

## Must-Have Results (ROADMAP.md success criteria)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `AddonGeneratedDeck` accepts `process_names: string[]` | ✓ | `packages/cli/src/addon/api.ts:36-42` — field present |
| Process matching case-insensitive + OS suffix | ✓ | `packages/cli/src/deck/runtime.ts:173` — `processNamesMatch` function |
| Active-win poller runs at 500ms | ✓ | Monitor interval configured in `system/active-app/` |
| When declared process is foreground → overlay deck shown | ✓ | `runtime.ts:1406-1407` — `processNamesMatch` check + overlay activation |
| Overlay uses local page history (no stack pollution) | ✓ | Overlay has its own `displayDeckId` / `overlayDeckId` separation |
| Reserved-slot button is toggle in overlay | ✓ | `system-buttons.ts:25-32` — overlay deck → `OVERLAY_TOGGLE_TYPE` |
| Double-tap back button within 350ms dismisses overlay | ✓ | `runtime.ts:1072-1078` — `onDblTap` calls `dismissOverlay()` |
| Overlay supports pagination + toggle on every page | ✓ | Toggle is injected per-deck by `getLastPositionSystemButton` |
| Pure Wayland surfaces warning + disables gracefully | ✓ | `get-provider.test.ts:153-163` — warn-once test passes |
| Two addons same process_name → first-match-wins + warning | ✓ | `runtime.ts:1410+` — warning logged for duplicates |
| `SIRENO_ADDON_API_VERSION` stays at 1 | ✓ | `packages/cli/src/addon/api.ts:14` — `= 1` |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| ACTIVEAPP-01 | `process_names` in manifest schema | ✓ `schemas.ts:130` + `api.ts:36-42` |
| ACTIVEAPP-02 | Case-insensitive substring + OS suffix match | ✓ `runtime.ts:173` `processNamesMatch` |
| ACTIVEAPP-03 | Active-app poller (500ms, cross-platform) | ✓ `active-app-monitor.ts` + tests |
| ACTIVEAPP-04 | Overlay deck shown when process matches | ✓ `runtime.ts:1406-1407` |
| ACTIVEAPP-05 | Overlay local history (no stack pollution) | ✓ Separate `overlayDeckId` state |
| ACTIVEAPP-06 | Toggle button + double-tap dismiss | ✓ `system-buttons.ts` + `runtime.ts:1072-1078` |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `runtime.ts` imports `processNamesMatch` | ✓ `runtime.ts:173` defined |
| `system-buttons.ts` exports `OVERLAY_TOGGLE_TYPE` | ✓ `system-buttons.ts:8` |
| `api.ts` exports `SIRENO_ADDON_API_VERSION` | ✓ `api.ts:14` |
| `settings-deck.tsx` renders `logo-version` | ✓ Fixed by 55-03 |

## Gap Closure (55-03)

Two pre-existing issues closed:
- **6a**: `internal-decks.test.ts:100` — `.toBe(5)` → `.toBe(3)` (Phase 3 gap-closure)
- **6b**: `settings-deck.tsx` — added `case 'logo-version':` in `renderSettingsButton`

## Summary

**Score:** 11/11 success criteria verified ✓

All automated checks passed. Phase goal achieved. The 2 pre-existing test failures (6a, 6b) were closed by gap-closure plan 55-03 during execution.
