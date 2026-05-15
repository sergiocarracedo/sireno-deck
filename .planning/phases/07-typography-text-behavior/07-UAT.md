---
status: testing
phase: 07-typography-text-behavior
source:
  - 07-01-SUMMARY.md
  - 07-02-SUMMARY.md
started: 2026-05-15T11:06:36+02:00
updated: 2026-05-15T11:06:36+02:00
---

## Current Test
number: 1
name: Theme-Driven Shared Typography
expected: |
  Start the CLI with the Phase 7 config/theme setup and inspect any button that uses the shared text renderer.
  Shared text should clearly follow the active theme typography instead of a hardcoded fallback.
  A theme switch between light and dark should produce visibly different text styling driven by the theme tokens.
awaiting: user response

## Tests

### 1. Theme-Driven Shared Typography
expected: Start the CLI with `--config packages/cli/fixtures/phase-7/config.shared-dark.yml`, then restart it with `--config packages/cli/fixtures/phase-7/config.shared-light.yml`. Inspect the same shared-text buttons in both runs. Shared text should clearly follow the active theme typography instead of a hardcoded fallback, and the dark-to-light theme switch should produce visibly different text styling driven by the theme tokens.
fixture:
  - `packages/cli/fixtures/phase-7/config.shared-dark.yml`
  - `packages/cli/fixtures/phase-7/config.shared-light.yml`
result: pending

### 2. Clip-Only Overflow Behavior
expected: Start the CLI with `--config packages/cli/fixtures/phase-7/config.shared-dark.yml` and inspect the button labeled `Long shared text should clip cleanly inside the button bounds`. Overflow should be clipped cleanly inside the button bounds. Text should not spill outside the intended region, and there should be no ellipsis, marquee, or accidental raster-crop-looking behavior.
fixture: `packages/cli/fixtures/phase-7/config.shared-dark.yml`
result: pending

### 3. Optional Shared Wrapper Contract
expected: Start the CLI with `--config packages/cli/fixtures/phase-7/config.wrapper-contract.yml`. The `phase-7-shared-wrapper-button` should render with the shared card/text shell using the explicit shared wrapper contract, while the neighboring `phase-7-bespoke-button` should still render normally without being forced through that wrapper. The review input is addon-authored on purpose so this check uses the same contract external addons would use.
fixture: `packages/cli/fixtures/phase-7/config.wrapper-contract.yml`
result: pending

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

none yet
