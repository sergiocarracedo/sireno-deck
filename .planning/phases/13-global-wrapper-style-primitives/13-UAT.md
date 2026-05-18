---
status: pending
phase: 13-global-wrapper-style-primitives
source:
  - 13-01-SUMMARY.md
  - 13-02-SUMMARY.md
started: 2026-05-18T17:30:00+02:00
updated: 2026-05-18T17:30:00+02:00
---

## Current Test
number: 1
name: global wrapper/style primitive review path
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-13/config.wrapper-style-primitives.yml`. On the `main` deck, key `0` (`Core Accent Primitive`) should render on the shared/default card path but with visibly stronger accent chrome than a plain shared/default button. Key `1` should still show the primitive-backed accent treatment while its explicit background override remains authoritative. Then press key `2` to navigate to `plain`. Key `0` on `plain` should stay on the ordinary shared/default path without the accent primitive styling.
awaiting: review

## Tests

### 1. Bundled Primitive Styling Is Visible On The Shared/Default Path
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-13/config.wrapper-style-primitives.yml`. On `main`, compare key `0` (`Core Accent Primitive`) against the plain shared/default button on `plain`. The primitive-backed key should keep the same shared/default layout but visibly change the small top accent bar and badge/chrome tinting through the bundled `core-buttons/accent` style primitive rather than through a bespoke variant path.
fixture: `packages/cli/fixtures/phase-13/config.wrapper-style-primitives.yml`
result: pending
pass_if:
  - Key `0` on `main` clearly uses the shared/default card path rather than a bespoke visual variant.
  - The accent primitive visibly changes shared/default chrome compared with the plain shared/default button on `plain`.
  - The accent effect comes from the primitive-backed path, not from changing the button type.
fail_if:
  - Primitive-backed buttons render identically to plain shared/default buttons.
  - The review path only works by switching onto a bespoke visual variant.

### 2. Explicit Background Override Still Wins Over Primitive Defaults
expected: On `main`, compare key `0` and key `1`. Both should show the same primitive-backed accent treatment, but key `1` (`Explicit Background Still Wins`) must still use its explicit configured background color instead of losing that Phase 12 precedence to the primitive.
fixture: `packages/cli/fixtures/phase-13/config.wrapper-style-primitives.yml`
result: pending
pass_if:
  - Key `1` visibly differs from key `0` because its explicit background override still wins.
  - Both keys still share the primitive-backed accent chrome treatment.
  - The primitive system composes with explicit props instead of replacing them.
fail_if:
  - The primitive path overwrites explicit background precedence.
  - Key `1` loses the primitive effect entirely instead of composing with its explicit background.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0

## Gaps

Both checks still require human visual review on a real rendered surface.
