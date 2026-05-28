---
status: complete
phase: 17-custom-wrapper-primitives-with-addon
source:
  - 17-01-SUMMARY.md
started: 2026-05-20T18:27:00+02:00
updated: 2026-05-28T10:18:00+02:00
---

## Current Test
number: complete
name: Phase 17 device rerun closed
expected: |
  The original two manual checks were closed by the later real-device rerun referenced in the Phase 17 state log and `17-04-SUMMARY.md`. This file is preserved as the audit trail of what reviewers were asked to verify on the shipped CLI/device surface.
awaiting: none

## Tests

### 1. Legacy Wrapper Compatibility Still Uses The Default Base-Shape Path
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-17/config.wrapper-compatibility.yml`. On `main`, compare key `0` (`Legacy Wrapper Compatibility`) against key `1` (`Explicit Full Surface`) and the plain default button on `contrast`. Key `0` must keep the shared/default chrome through the shipped `wrapper_id` compatibility path, while key `1` must not silently pick up that wrapper chrome because `full_surface: true` opts out explicitly.
fixture: `packages/cli/fixtures/phase-17/config.wrapper-compatibility.yml`
result: pass
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
result: pass
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
passed: 2
issues: 0
pending: 0
skipped: 0

## Gaps

The original rerun transcript was not preserved as a separate session artifact, but later shipped-state notes record that the real-device rerun passed after the `17-04` transport fix. This file now serves as the preserved review checklist plus the reconciled final result. Interaction-state chrome still remains intentionally limited to the currently observable base-shape surface until a later slice widens the device-path proof.
