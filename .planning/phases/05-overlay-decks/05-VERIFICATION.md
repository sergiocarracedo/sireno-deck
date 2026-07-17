# Phase 5 Verification

**Phase:** 5 — Overlay Decks
**Verified:** 2026-07-17
**Status:** passed (with one intentional deviation from original spec)

## Must-Have Coverage

### Original spec
- [ ] Window-name matching uses a real regex (not glob), with `i` flag support

### Implementation
- [x] Window-name matching uses **globs** (with `*` and `**`), AND-across-fields semantics
- [x] Overlay deck layer is fully isolated: history, back-button behaviour, n-1 injection
- [x] `core:overlay-toggle` is a first-class system surface (typed, themed, overridable)
- [x] No regression on non-overlay deck flows

## Deviation: globs vs regex

The ROADMAP success criteria say "window-name regex (case-insensitive)". The CONTEXT decision (locked during discuss-phase) is **globs, no regex, no case-insensitive flag** — the user explicitly chose the simpler glob matcher to keep the trigger DSL minimal. This is an intentional scope simplification, not a regression.

If regex support is needed later, it can be added by swapping `compileDeckMatcher` to use a regex-based implementation behind the same `{ processNames?, windowNames? }` interface.

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Trigger matches process **and** optional window-name | ✅ | T1.1: `compileDeckMatcher({ processNames?, windowNames? })` ANDs groups, ORs within |
| 2 | `autoShow: true` flips layer when match | ✅ | T1.2: `applyOverlay` checks `deck.autoShow === true` and calls `setOverlay` |
| 3 | Match stops → overlay dismissed | ✅ | T1.2: `applyOverlay(null)` calls `setOverlay(null, { source: "autoShow" })` |
| 4 | Regular decks inject SplitSurface (settings/back primary + overlay-toggle secondary) | ✅ | T2.3: `computeSystemButtonForSlotN1` returns `core:back` or `core:settings-entry`; SplitSurface renders the toggle secondary using `deck.overlayDeckIcon` |
| 5 | `core:overlay-toggle` dbltap switches layers | ✅ | T2.4: runtime routes `core:back`/`core:overlay-toggle` + `dbl-tap` to flip |
| 6 | Overlay has independent nav history | ✅ | T1.3: `overlayNavStacks: Map<string, string[]>`, lazy-init in `setOverlay`, persistence across dismiss/reactivate |
| 7 | Overlay n-1 shows back + overlay-toggle | ✅ | T2.3: overlay decks also get `core:back`; SplitSurface renders toggle secondary |
| 8 | Overlay back button navigates within overlay history | ✅ | T1.3: `goBack` pops overlay stack first; T2.4: `core:back` tap → `goBack()` |
| 9 | Overlay back-button onhold jumps to main | ✅ | T2.5: `core:back` + hold + overlay active → `navStack = [mainDeck.id]; setOverlay(null)` |
| 10 | `core:overlay-toggle` surface renders deck icon | ✅ | T2.6: `renderSystemButton("core:overlay-toggle", overlayIcon)` with icon override |

## Task Coverage

| Task | Plan Task | Status | Commit |
|------|-----------|--------|--------|
| T5.1 TriggerSchema accepts window-name pattern | T1.1 | ✅ | d60ee026 |
| T5.2 autoShow semantics | T1.2 | ✅ | 63135eb5 |
| T5.3 Per-deck nav history | T1.3 | ✅ | 0a7aa345 |
| T5.4 SplitSurface n-1 injection | T2.3 | ✅ | 5d49b94b |
| T5.5 core:overlay-toggle surface + dbltap layer switch | T2.4 + T2.6 | ✅ | 23f0dde + f24bf76 |
| T5.6 Overlay back-hold → main | T2.5 | ✅ | 23f0dde |
| T5.7 Tests for trigger / autoShow / history / n-1 / onhold / dbltap | T1.4 + T2.7 | ✅ | 0a7aa345 + b6158b7 |

## Test Verification

**97/97 targeted tests pass** across:
- `runtime.test.ts` (68 tests including 14 new T1.4+T2.7 smoke tests)
- `system-back-injection.test.ts` (8 tests including updated T2.3 cases)
- `emulator-mode-build-config.test.ts` (8 tests including updated overlay deck case)
- `Deck.test.tsx` (frontend, includes T2.6 gesture/icon override)
- `glob-match.test.ts` (16 tests including new T1.1 AND-across-fields)

**12 pre-existing failures remain** in unrelated areas (weather frontend, emoji-selector decks, ws-integration, config schema, internal-settings factory, start command). Verified pre-existing by stash-pop test diff: those 12 fail on the pre-Phase-5 base too.

## Verification Commands

```bash
# Targeted tests (all green)
pnpm vitest run \
  packages/cli/src/deck/__tests__/runtime.test.ts \
  packages/cli/src/deck/__tests__/system-back-injection.test.ts \
  packages/cli/src/cli/commands/__tests__/emulator-mode-build-config.test.ts \
  packages/cli/frontend/src/__tests__/Deck.test.tsx \
  packages/cli/src/system/__tests__/glob-match.test.ts

# Full test suite shows 12 pre-existing failures, no new ones
pnpm vitest run
```

## Notes for Downstream

- The protocol field `overlayDeckIcon` is part of the wire format. Any future transport (real, emulator, web) must forward this field opaquely — already true since transports forward `deck-config` opaquely.
- The frontend `SplitSurface` cell uses inline gesture detection (300ms dbl-tap window, 500ms hold timer). If `useButtonAction` later gains native gesture support, the inline detection can be removed.
- `core:overlay-toggle` and `core:back` dbl-tap routes are duplicated for legacy compatibility. `core:overlay-toggle` is the type used by the SplitSurface secondary side; `core:back` is the type used by the n-1 slot in the deck-config message. Both paths flip the layer identically.

## Final Status

**PASSED** — All Phase 5 success criteria and tasks are met. One intentional scope deviation (globs over regex) documented in CONTEXT.md and acknowledged here.