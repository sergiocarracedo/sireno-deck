---
status: pending
phase: 17-custom-wrapper-primitives-with-addon
source:
  - 17-01-SUMMARY.md
started: 2026-05-20T18:27:00+02:00
updated: 2026-05-20T18:27:00+02:00
---

## Current Test
number: 2
name: explicit full-surface rendering visibly bypasses the base shape
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-17/config.wrapper-compatibility.yml`. On `main`, key `0` should still show the familiar shared/default card chrome through legacy `wrapper_id: core-buttons/shared-card`, while key `1` should render as a flatter full-bleed text surface with no shared/default card frame, top accent strip, or badge chrome because it opts into `full_surface: true`.
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

### 2. Explicit Full-Surface Rendering Visibly Bypasses The Base Shape
expected: Using the same running fixture, inspect key `1` (`Explicit Full Surface`). It should not show the rounded shared/default card frame, top accent strip, or badge chrome seen on key `0`. Instead it should render as a flatter full-surface text treatment that uses the available surface directly. The contrast deck remains available for comparing against a plain default text button.
fixture: `packages/cli/fixtures/phase-17/config.wrapper-compatibility.yml`
result: pending
pass_if:
  - Key `1` is visibly different from the shared/default base-shape card on key `0`.
  - Key `1` does not show the shared/default frame, chip, or top accent strip.
  - The visible difference is large enough to judge on the real CLI/device surface without reading code.
fail_if:
  - Key `1` still looks like the shared/default base-shape card.
  - The full-surface path only differs in invisible internal metadata.
  - Reviewers cannot clearly tell which surface is the base shape and which is the full-surface escape hatch.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0

## Gaps

Pending execution. The first Phase 17 rollout preserves the existing shared/default chrome, but the real CLI/device path still does not expose separately reviewable tap/hold visual states. Treat interaction-state chrome as intentionally limited to the currently observable base-shape surface until a later slice adds honest device-path proof.
