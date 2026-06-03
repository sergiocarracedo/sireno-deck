---
status: complete
phase: 24-mounted-addon-render-contract
source:
  - 24-05-SUMMARY.md
  - 24-06-SUMMARY.md
  - 24-07-SUMMARY.md
  - 24-08-SUMMARY.md
started: 2026-05-26T15:37:21+02:00
updated: 2026-05-26T18:20:00+02:00
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
rerun_result: pass
rerun_notes: "After 24-08, the emulator keeps the mounted deck's theme utility and theme asset style blocks and rewrites theme font URLs to `/__sireno/assets?path=...`, so the browser page no longer drops theme CSS or depends on `file://` font URLs."

### 2. Emulator no longer churns the whole deck mount on the live clock path
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and inspect the live `date-time` case again. The clock should still update because the button/runtime polling seam is intentional, but the emulator page should no longer rebuild the whole `#deck-mount` subtree every second. The visible DOM churn should be narrowed to the changed deck content rather than `mount.innerHTML = deckHtml`-style full replacement.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the built-ins that were broken before now render correctly on the HTTP-served emulator page: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and its images/icons are no longer broken, `Main` returns back, and the `Action` button still renders normally without obvious layout/state regressions."
  status: closed-after-rerun
  reason: "User initially reported: Images are ok, but no theme css or fonts are loaded"
  severity: major
  test: 1
  root_cause: "The emulator transport in `packages/cli/src/cli/commands/start.ts` served only the extracted `#deck-root` subtree, which dropped the `data-sireno-theme-utilities` and `data-sireno-theme-assets` style blocks emitted by `renderDomDeck(...)`. Those style blocks carried both the theme utility CSS and the `@font-face` declarations. `packages/cli/src/config/theme.ts` also left emulator-facing theme font URLs as `file://...`, which the HTTP-served emulator page could not load."
  affected_files:
    - packages/cli/src/cli/commands/start.ts
    - packages/cli/src/config/theme.ts
    - packages/cli/src/config/theme.test.ts
    - packages/cli/src/cli/commands/start.test.ts
  rerun_plan: ".planning/phases/24-mounted-addon-render-contract/24-08-PLAN.md"
  closure: "Closed by preserving theme style blocks on the emulator transport and rewriting emulator-served theme font URLs to browser-loadable `/__sireno/assets?path=...` endpoints."
