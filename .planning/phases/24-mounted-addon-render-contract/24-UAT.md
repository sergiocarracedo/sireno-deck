---
status: complete
phase: 24-mounted-addon-render-contract
source:
  - 24-05-SUMMARY.md
  - 24-06-SUMMARY.md
  - 24-07-SUMMARY.md
started: 2026-05-26T15:05:52+02:00
updated: 2026-05-26T16:05:00+02:00
---

## Current Test
number: none
name: none
expected: none
awaiting: none

## Tests

### 1. Shipped built-ins render correctly in the emulator after the asset fix
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the built-ins that were broken before now render correctly on the HTTP-served emulator page: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and its images/icons are no longer broken, `Main` returns back, and the `Action` button still renders normally without obvious layout/state regressions.
result: issue
reported: "images still broken: i guess the problem is you are using 'file' file:///works/opensource/sireno-deck/packages/cli/src/builtin-addons/emoji-selector/assets/favorites.svg and the browser has no access to file."
severity: major
rerun_result: pass
rerun_notes: After `24-07`, config-expanded emoji deck icons stay as `addon://...` refs through validation, so the emulator can rewrite them to `/__sireno/assets?ref=...` instead of leaking `file://...favorites.svg` into the browser page.

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

No open gaps remain from the Phase 24 rerun session.
