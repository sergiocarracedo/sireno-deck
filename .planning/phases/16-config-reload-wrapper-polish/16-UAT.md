---
status: complete
phase: 16-config-reload-wrapper-polish
source:
  - 16-01-SUMMARY.md
  - 16-02-SUMMARY.md
  - 16-03-SUMMARY.md
  - 16-04-SUMMARY.md
started: 2026-05-19T22:39:50+02:00
updated: 2026-05-20T13:35:00+02:00
---

## Current Test
number: 4
name: shared wrapper footer is gone and accent override is visibly applied
expected: |
  While using the same UAT fixture, confirm the shared-wrapper button on key `0` no longer shows the old theme-name footer text at the bottom of the card. Then change `accent: success` in `/tmp/sireno-phase16-uat/decks/main.yml` to `accent: '#7c3aed'` and save. The shared card should remain on the same deck, still have no footer, and its accent treatment should change visibly from the token-based success color to the raw violet override.
awaiting: none

## Tests

### 1. Deck-File Reference Loads And Starts Normally
expected: Create `/tmp/sireno-phase16-uat/config.yml` plus `/tmp/sireno-phase16-uat/decks/main.yml` exactly as described in Current Test, then start the daemon from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config /tmp/sireno-phase16-uat/config.yml`. The daemon should start successfully, load `main` from the referenced file, and render a shared/default wrapper button labeled `Clock` on key `0`.
fixture: `/tmp/sireno-phase16-uat/config.yml` + `/tmp/sireno-phase16-uat/decks/main.yml`
result: pass
pass_if:
  - The daemon starts without a config validation error.
  - The referenced deck file is accepted as the `main` deck source.
  - Key `0` visibly renders the expected `Clock` button from the referenced deck file.
fail_if:
  - Startup fails with a config error.
  - The deck reference is ignored or treated like plain text.
  - The rendered button does not match the referenced deck file.

### 2. Valid Referenced-Deck Edit Reloads Without Losing The Current Deck
expected: With the daemon from Test 1 still running, edit `/tmp/sireno-phase16-uat/decks/main.yml` so key `0` changes from `Clock` to `Updated Clock` while keeping the same position, wrapper, and `accent: success`. Save the file once. Expected result: the running daemon reloads automatically, key `0` updates to `Updated Clock` without restarting the process, and the surface stays on the same deck instead of resetting to some other view.
fixture: `/tmp/sireno-phase16-uat/decks/main.yml`
result: pass
pass_if:
  - Saving the referenced deck file triggers a live reload automatically.
  - The visible label changes to `Updated Clock`.
  - The current deck context is preserved rather than resetting unexpectedly.
fail_if:
  - A manual restart is required to see the change.
  - The deck resets unnecessarily.
  - The visible surface stays stale after the file save.

### 3. Invalid Edit Enters The Temporary Error Deck And Valid Fix Recovers Automatically
expected: With the daemon still running, break `/tmp/sireno-phase16-uat/decks/main.yml` by changing `type: action` to `type: broken-button`. Save the file. Expected result: the daemon stays alive but the device switches to a runtime-owned error surface showing a compact config error summary instead of silently leaving the old `Updated Clock` surface in place. Then fix the file by restoring `type: action` and save again. Expected result: the temporary error surface disappears automatically and the normal `Updated Clock` deck returns without restarting the daemon.
fixture: `/tmp/sireno-phase16-uat/decks/main.yml`
result: pass
pass_if:
  - Invalid reload does not stop the daemon.
  - The device switches to a visible config-error surface instead of silently keeping the old deck.
  - Restoring valid config exits the error surface automatically.
fail_if:
  - The daemon crashes or exits.
  - The old surface remains with no visible error state.
  - Fixing the config still requires a restart.

### 4. Shared Wrapper Footer Is Gone And Accent Override Is Visibly Applied
expected: While using the same UAT fixture, confirm the shared-wrapper button on key `0` no longer shows the old theme-name footer text at the bottom of the card. Then change `accent: success` in `/tmp/sireno-phase16-uat/decks/main.yml` to `accent: '#7c3aed'` and save. Expected result: the shared card remains on the same deck, still has no footer, and its accent treatment changes visibly from the token-based success color to the raw violet override.
fixture: `/tmp/sireno-phase16-uat/decks/main.yml`
result: pass
pass_if:
  - No theme-name footer is visible on the shared/default card.
  - Changing `accent` from `success` to `#7c3aed` produces a visible accent change.
  - The override remains constrained to the shared/default button path.
fail_if:
  - Footer text is still visible.
  - The accent override has no visible effect.
  - The change requires a restart instead of live reload.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

None. Historical startup and accent-visibility gaps were closed by `16-05` and `16-06`, then verified by the final rerun recorded above.
