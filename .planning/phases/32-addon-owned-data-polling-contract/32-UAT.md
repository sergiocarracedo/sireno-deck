---
status: complete
phase: 32-addon-owned-data-polling-contract
source:
  - .planning/phases/32-addon-owned-data-polling-contract/32-01-SUMMARY.md
  - .planning/phases/32-addon-owned-data-polling-contract/32-02-SUMMARY.md
  - .planning/phases/32-addon-owned-data-polling-contract/32-03-SUMMARY.md
  - .planning/phases/32-addon-owned-data-polling-contract/32-04-SUMMARY.md
started: 2026-06-01T22:46:52+02:00
updated: 2026-06-02T09:56:20+02:00
---

## Current Test
number: done
name: all tests complete
expected: |
  Verify-work UAT is complete for this phase.
awaiting: none

## Tests

### 1. Default Config Still Renders Migrated Built-Ins Cleanly
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`. On the main deck, key `4` (`system-status-bars`) and key `5` (`system-status-label-values`) should render visible metric content instead of blank/error tiles, and key `6` (`media-player`) should show either truthful playback data or the explicit unavailable state. Leaving the emulator open for a few seconds should not freeze those tiles on first paint.
result: pass

### 2. System-Status Keeps Unavailable Metrics Honest While Live Metrics Continue Updating
expected: Keep the same `config.yml` emulator session open for several seconds. Expected: visible system-status values continue to refresh over time, and any unsupported metric slots remain explicitly visible as `N/A`/unavailable instead of disappearing, collapsing layout, or turning into a generic error tile.
result: pass

### 3. Media-Player Degrades Honestly Or Controls Real Playback Truthfully
expected: In the same `config.yml` emulator session, inspect key `6`. Expected: if no supported media session is available, the tile stays in the explicit unavailable state from config rather than showing fake metadata. If you do have a supported media session, the tile should reflect real play/pause status and metadata, and tapping it should toggle playback truthfully instead of blindly flipping the visible state.
result: pass

### 4. Get-Set Toggle Ignores Early Taps Until The First Authoritative Read Settles
expected: From `packages/cli`, first run `printf 'off' > /tmp/sireno-phase14-get-set-state`, then run `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-14/config.toggle-get-set.yml --port 0`. Expected: key `0` (`Desk Lamp`) begins in a pending/read state, then settles to `OFF`. If you tap before that first read has settled, it should not jump to an incorrect `ON` state just because you pressed early. After the first authoritative read, normal toggle behavior should still work.
result: pass

### 5. Implicit Locked Fallback Still Renders A Complete `HH:MM` Row
expected: From `packages/cli`, run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.locked-time-layout.yml`. Navigate from `main` to `review`, then trigger the supported lock transition used for locked-session review on your setup. Expected: the implicit locked fallback appears as a centered five-button `[H][H][:][M][M]` row with no blank split slots, and unlock restores the exact pre-lock `review` deck. If you cannot trigger a supported lock event on this machine, skip this test.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
