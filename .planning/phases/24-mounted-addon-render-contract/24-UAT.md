---
status: complete
phase: 24-mounted-addon-render-contract
source:
  - 24-05-SUMMARY.md
  - 24-06-SUMMARY.md
started: 2026-05-26T15:05:52+02:00
updated: 2026-05-26T15:09:45+02:00
---

## Current Test
number: 2
name: Emulator no longer churns the whole deck mount on the live clock path
expected: |
  From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and inspect the live `date-time` case again.

  The clock should still update because the button/runtime polling seam is intentional, but the emulator page should no longer rebuild the whole `#deck-mount` subtree every second. The visible DOM churn should be narrowed to the changed deck content rather than `mount.innerHTML = deckHtml`-style full replacement.
awaiting: none

## Tests

### 1. Shipped built-ins render correctly in the emulator after the asset fix
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the built-ins that were broken before now render correctly on the HTTP-served emulator page: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and its images/icons are no longer broken, `Main` returns back, and the `Action` button still renders normally without obvious layout/state regressions.
result: issue
reported: "images still broken: i guess the problem is you are using 'file' file:///works/opensource/sireno-deck/packages/cli/src/builtin-addons/emoji-selector/assets/favorites.svg and the browser has no access to file."
severity: major

### 2. Emulator no longer churns the whole deck mount on the live clock path
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and inspect the live `date-time` case again. The clock should still update because the button/runtime polling seam is intentional, but the emulator page should no longer rebuild the whole `#deck-mount` subtree every second. The visible DOM churn should be narrowed to the changed deck content rather than `mount.innerHTML = deckHtml`-style full replacement.
result: pending
result: pass

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the built-ins that were broken before now render correctly on the HTTP-served emulator page: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and its images/icons are no longer broken, `Main` returns back, and the `Action` button still renders normally without obvious layout/state regressions."
  status: failed
  reason: "User reported: images still broken: i guess the problem is you are using 'file' file:///works/opensource/sireno-deck/packages/cli/src/builtin-addons/emoji-selector/assets/favorites.svg and the browser has no access to file."
  root_cause: "`packages/cli/src/core/schemas.ts` still resolves config/authored `addon://` and `builtin://` asset references into baked `file://...` URLs during `validateConfig()` via `resolveAssetReferences()`. That happens before DOM render-time, so emoji deck buttons generated through config/deck expansion never reach `createDomIcon()` with the original asset reference and the emulator-specific HTTP asset resolver in `packages/cli/src/cli/commands/start.ts` never gets a chance to rewrite them."
  affected_files:
    - packages/cli/src/core/schemas.ts
    - packages/cli/src/config/loader.test.ts
    - packages/cli/src/cli/commands/start.ts
  rerun_plan: ".planning/phases/24-mounted-addon-render-contract/24-07-PLAN.md"
  severity: major
  test: 1
