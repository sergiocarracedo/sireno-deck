# Quick Task 017 Summary

**Task:** Fix the Phase 29 review findings: stop toggle render from mutating persisted store state, remove dead date-time class tokens, and add focused regression coverage
**Completed:** 2026-05-28

## What was done
Stopped the command-driven toggle renderer from mutating persisted button store state while deriving its pending fallback label, and removed the dead `fit-wrap` / `leading-1` tokens from the shipped date-time button. Added focused regression coverage proving the toggle render path leaves the snapshot untouched and the date-time mounted render no longer emits the dead class tokens.

## Files changed
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx`: derived command-driven display fallback locally instead of mutating `store.button.snapshot` during render.
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`: removed dead class tokens and relied on the real `Text` wrap contract.
- `packages/cli/src/builtin-addons/core-buttons/index.test.ts`: added regression coverage for render-phase store immutability.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: added regression coverage for the date-time mounted render output.

## Commit
`b97fea5`
