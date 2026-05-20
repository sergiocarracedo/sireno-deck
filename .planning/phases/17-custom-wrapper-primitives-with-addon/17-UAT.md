---
status: pending
phase: 17-custom-wrapper-primitives-with-addon
source:
  - 17-01-SUMMARY.md
started: 2026-05-20T18:27:00+02:00
updated: 2026-05-20T18:27:00+02:00
---

## Current Test
number: 1
name: legacy wrapper compatibility still renders through the default base-shape path
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-17/config.wrapper-compatibility.yml`. On `main`, key `0` should still render with the familiar shared/default chrome even though it only uses legacy `wrapper_id: core-buttons/shared-card`, while key `1` should visibly avoid that chrome because it opts into `full_surface: true`.
awaiting: none

## Tests

### 1. Legacy Wrapper Compatibility Still Uses The Default Base-Shape Path
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-17/config.wrapper-compatibility.yml`. On `main`, compare key `0` (`Legacy Wrapper Compatibility`) against key `1` (`Explicit Full Surface`) and the plain default button on `contrast`. Key `0` must keep the shared/default chrome through the shipped `wrapper_id` compatibility path, while key `1` must not silently pick up that wrapper chrome because `full_surface: true` opts out explicitly.
fixture: `packages/cli/fixtures/phase-17/config.wrapper-compatibility.yml`
result: pending
pass_if:
  - Key `0` visibly keeps the shared/default card chrome through `wrapper_id: core-buttons/shared-card`.
  - Key `1` does not render with the shared/default wrapper chrome because `full_surface: true` opts out explicitly.
  - The contrast deck still provides a plain default button for side-by-side comparison.
fail_if:
  - Legacy `wrapper_id` no longer affects the visible shared/default path.
  - `full_surface: true` still renders through the wrapper compatibility path.
  - The difference is only theoretical and not reviewable on the actual CLI/device surface.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0

## Gaps

Pending execution. Phase 17 interaction-state review will be added later if the base-shape path still cannot show tap/hold chrome honestly on the real surface.
