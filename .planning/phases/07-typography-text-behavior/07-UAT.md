---
status: complete
phase: 07-typography-text-behavior
source:
  - 07-01-SUMMARY.md
  - 07-02-SUMMARY.md
  - 07-03-SUMMARY.md
started: 2026-05-15T16:40:00+02:00
updated: 2026-05-15T16:52:00+02:00
---

## Current Test
number: 0
name: complete
expected: |
  UAT session complete.
awaiting: none

## Tests

### 1. Theme-Driven Shared Typography
expected: Start the CLI with `--config packages/cli/fixtures/phase-7/config.shared-dark.yml`, then restart it with `--config packages/cli/fixtures/phase-7/config.shared-light.yml`. Inspect the same shared-text buttons in both runs. Shared text should clearly follow the active theme typography, and the dark-to-light switch should now produce an obvious visible typography difference through the shipped token changes rather than depending only on host font-family resolution.
fixture:
  - `packages/cli/fixtures/phase-7/config.shared-dark.yml`
  - `packages/cli/fixtures/phase-7/config.shared-light.yml`
result: pass

### 2. Clip-Only Overflow Behavior
expected: Start the CLI with `--config packages/cli/fixtures/phase-7/config.shared-dark.yml` and inspect the button labeled `Long shared text should clip cleanly inside the button bounds`. Overflow should be clipped cleanly inside the button bounds. Text should not spill outside the intended region, and there should be no ellipsis, marquee, or accidental raster-crop-looking behavior.
fixture: `packages/cli/fixtures/phase-7/config.shared-dark.yml`
result: pass

### 3. Optional Shared Wrapper Contract
expected: Start the CLI with `--config packages/cli/fixtures/phase-7/config.wrapper-contract.yml`. The `phase-7-shared-wrapper-button` should render with the shared card/text shell using the explicit shared wrapper contract, while the neighboring `phase-7-bespoke-button` should still render normally without being forced through that wrapper. The review input is addon-authored on purpose so this check uses the same contract external addons would use.
fixture: `packages/cli/fixtures/phase-7/config.wrapper-contract.yml`
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
