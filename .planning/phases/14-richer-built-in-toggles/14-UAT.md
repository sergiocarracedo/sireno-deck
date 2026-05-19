---
status: pending
phase: 14-richer-built-in-toggles
source:
  - 14-01-PLAN.md
started: 2026-05-19T10:40:00+02:00
updated: 2026-05-19T10:40:00+02:00
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

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0

## Gaps

This check still requires human review on a real CLI/device surface.
