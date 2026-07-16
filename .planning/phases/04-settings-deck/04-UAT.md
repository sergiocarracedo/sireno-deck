# Phase 4 UAT — Settings Deck

```yaml
phase: "04-settings-deck"
status: testing
current_test: 1
date: 2026-07-14
```

## Tests

| # | Test | Result |
|---|------|--------|
| 1 | Settings button at position n-1 of main deck opens internal settings deck | failed → fixed |
| 2 | Settings deck position 0 = "Darker", position 1 = "Lighter", position 2 = "Sireno v0.0.0" | pending |
| 3 | Tapping Lighter increases brightness, progress bar appears | pending |
| 4 | Tapping Darker decreases brightness, progress bar appears | pending |
| 5 | Progress bar auto-hides after 2 seconds | pending |
| 6 | Real Stream Deck brightness updates via device.setBrightness (requires hardware) | pending |

## Summary

- Total: 6
- Passed: 0
- Issues: 1 (diagnosed → fixed inline)
- Pending: 5
- Skipped: 0

## Gaps

### Issue 1 — Settings button + back button + addon handlers don't react on tap (resolved)

- **truth:** Settings-entry system button tap → no navigation; back system button on settings deck → noop; addon button taps inside settings deck → noop.
- **status:** diagnosed
- **severity:** blocker
- **test:** 1 (covers system buttons); affects 3, 4 also (button presses).
- **root_cause:** Two compounding bugs:
  1. `packages/cli/src/deck/runtime.ts:118` `findButton` split `id` on the first colon, but addon deck ids use the format `addon:deck` (e.g. `internal-settings:settings`) — splitting on first colon mis-parsed `internal-settings:settings:brightness-down` as `deckId="internal-settings"`, `buttonId="settings:brightness-down"`. Fix: split on last colon (`id.lastIndexOf(":")`).
  2. `packages/cli/src/cli/commands/addon-decks.ts:173` skipped internal addon decks entirely (`if (deckType.def.internal) continue`). Without the deck in the runtime's `decks` array, `runtime.navigateToDeck("internal-settings:settings")` silently logged "deck not found" and the system button did nothing. Fix: remove the internal-skip so internal addon decks are still materialised and reachable via `navigateToDeck` (none are marked `isMain`, so they don't steal the main deck carousel).
- **affected_files:**
  - `packages/cli/src/deck/runtime.ts:118`
  - `packages/cli/src/cli/commands/addon-decks.ts:173`
- **verification:** `pnpm vitest run packages/cli/src/deck/__tests__/runtime.test.ts packages/cli/src/deck/__tests__/addon-handler-bridge.test.ts packages/cli/src/cli/commands/__tests__/addon-decks.test.ts` → 66 tests pass.
