---
status: complete
phase: 24-mounted-addon-render-contract
source:
  - 24-05-SUMMARY.md
  - 24-06-SUMMARY.md
  - 24-07-SUMMARY.md
started: 2026-05-26T15:37:21+02:00
updated: 2026-05-26T16:35:43+02:00
---

## Current Test
number: none
name: none
expected: none
awaiting: none

## Tests

### 1. Shipped built-ins render correctly in the emulator after the asset fixes
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the built-ins that were broken before now render correctly on the HTTP-served emulator page: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and its images/icons are no longer broken, `Main` returns back, and the `Action` button still renders normally without obvious layout/state regressions.
result: issue
reported: "Images are ok, but no theme css or fonts are loaded"
severity: major

### 2. Emulator no longer churns the whole deck mount on the live clock path
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and inspect the live `date-time` case again. The clock should still update because the button/runtime polling seam is intentional, but the emulator page should no longer rebuild the whole `#deck-mount` subtree every second. The visible DOM churn should be narrowed to the changed deck content rather than `mount.innerHTML = deckHtml`-style full replacement.
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
  reason: "User reported: Images are ok, but no theme css or fonts are loaded"
  severity: major
  test: 1
  root_cause: "The emulator transport in `packages/cli/src/cli/commands/start.ts` still serves only the extracted `#deck-root` subtree via `extractDeckRootHtml(...)`, so it drops the `data-sireno-theme-utilities` and `data-sireno-theme-assets` style blocks emitted by `renderDomDeck(...)`. Those style blocks carry both the theme utility CSS and the `@font-face` declarations. Even after preserving them, `packages/cli/src/config/theme.ts` currently rewrites theme stylesheet asset URLs to `file://...`, which is not browser-loadable from the HTTP-served emulator page."
  affected_files:
    - packages/cli/src/cli/commands/start.ts
    - packages/cli/src/render/dom-host.tsx
    - packages/cli/src/config/theme.ts
    - packages/cli/src/config/theme.test.ts
  rerun_plan: ".planning/phases/24-mounted-addon-render-contract/24-08-PLAN.md"
