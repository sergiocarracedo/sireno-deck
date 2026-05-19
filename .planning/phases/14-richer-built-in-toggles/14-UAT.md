---
status: pending
phase: 14-richer-built-in-toggles
source:
  - 14-01-PLAN.md
  - 14-02-PLAN.md
  - 14-03-PLAN.md
started: 2026-05-19T10:40:00+02:00
updated: 2026-05-19T10:50:00+02:00
---

## Current Test
number: 1
name: internal toggle review path
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-14/config.toggle-internal.yml`. On `main`, key `0` (`Desk Lamp`) should render on the shipped toggle card path with an internal-mode accent and show `OFF` before interaction. Tap key `0` once and confirm the same key visibly changes to `ON`. Then tap key `1` to enter `apps`, tap key `0` to return to `main`, and confirm key `0` still shows `ON` within the same running daemon instead of resetting.
awaiting: review

## Tests

### 1. Internal Toggle Renders, Flips, And Survives Deck Re-entry
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-14/config.toggle-internal.yml`. On `main`, verify that key `0` (`Desk Lamp`) uses the shipped toggle card path rather than a plain display card. Tap key `0` once to switch it from `OFF` to `ON`. Then leave `main` through key `1` (`Apps`), return through key `0` (`Main`), and confirm the toggle still shows `ON` in the same daemon session.
fixture: `packages/cli/fixtures/phase-14/config.toggle-internal.yml`
result: pending
pass_if:
  - Key `0` visibly uses the shipped toggle card family on `main`.
  - Tapping key `0` changes the visible state from `OFF` to `ON`.
  - Leaving `main` and returning does not reset the internal toggle state while the daemon keeps running.
fail_if:
  - The button renders like a plain shared/default display button instead of the toggle card path.
  - The visible state does not change after a tap.
  - Returning from `apps` resets the toggle back to `OFF` without restarting the daemon.

### 2. Get-Set Toggle Starts Pending, Reads Authoritative State, And Uses Command-Mode Chrome
expected: From `packages/cli`, initialize the fixture state file with `printf 'off' > /tmp/sireno-phase14-get-set-state`, then start the CLI with `pnpm exec tsx src/cli.ts start --config fixtures/phase-14/config.toggle-get-set.yml`. On `main`, key `0` (`Desk Lamp`) should start in a visibly pending state until the first read succeeds, then settle to `OFF`. Compare it against key `1` (`Internal Ref`) and confirm both stay on the same shipped toggle card family while the get-set key uses command-authority chrome that is visibly different from the internal key. Tap key `0` once and confirm it ends at `ON` only after the authoritative command path runs and reads back the updated state file.
fixture: `packages/cli/fixtures/phase-14/config.toggle-get-set.yml`
result: pending
pass_if:
  - Key `0` starts pending and then settles from authoritative command output instead of guessing an initial state.
  - Key `0` and key `1` share the same base toggle family, but the get-set key uses visibly different command-mode chrome.
  - Tapping key `0` changes the final visible state to `ON` only after the command-driven path completes.
fail_if:
  - The get-set key boots directly into `ON` or `OFF` without a pending/read phase.
  - The get-set key is visually indistinguishable from the internal key despite using a different authority model.
  - The button locally flips without reconciling through the configured command path.

### 3. Toggle-Status Uses Write-Then-Reconcile Instead Of Local Inversion
expected: From `packages/cli`, initialize both command fixtures with `printf 'off' > /tmp/sireno-phase14-toggle-status-state` and `printf 'off' > /tmp/sireno-phase14-get-set-state`, then start the CLI with `pnpm exec tsx src/cli.ts start --config fixtures/phase-14/config.toggle-toggle-status.yml`. On `main`, compare key `0` (`Desk Lamp`) against key `1` (`Get-Set Ref`) and confirm both stay on the shipped toggle family while `toggle-status` uses a visibly distinct mode accent from `get-set`. Tap key `0` once and confirm it finishes at `ON` only after the toggle command mutates the backing file and `status_command` reads the new truth back. The surface should reconcile through the command read, not by blindly inverting the prior visible state.
fixture: `packages/cli/fixtures/phase-14/config.toggle-toggle-status.yml`
result: pending
pass_if:
  - Key `0` and key `1` share the same base toggle family but remain visually distinguishable by mode accent.
  - Tapping key `0` ends at `ON` only after the write-then-status reconciliation path completes.
  - The review path proves `toggle-status` as a separate command-authority model from `get-set`, not as a local optimistic flip.
fail_if:
  - The `toggle-status` key is visually indistinguishable from the `get-set` key.
  - The visible state flips immediately without depending on the follow-up `status_command` read.
  - The final Phase 14 review surface omits one of the three shipped toggle modes.

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

These checks still require human review on a real CLI/device surface.
