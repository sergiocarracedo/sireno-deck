# Plan 29-02 Summary

**Completed:** 2026-05-28

## What was built
The built-in date-time addon now follows the Phase 29 structure and formatter rules: each shipped button definition lives in its own TSX file, shared schemas/helpers moved into nearby support modules, and the digital formatter now uses explicit `dayjs` behavior instead of the old custom token map. The stable addon registry and existing runtime-visible button ids stayed intact, so the locked-time fallback and other date-time surfaces still render through the normal built-in/runtime path.

## Key files
- `packages/cli/src/builtin-addons/date-time/index.ts`: reduced to a stable registry file that re-exports the four button definitions and helper surface.
- `packages/cli/src/builtin-addons/date-time/schemas.ts`: owns shared schemas, config types, and refresh cadence constants.
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`: kept the existing TSX render path but now imports the shared schema and Day.js-backed formatter.
- `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile.tsx`: owns the locked-time tile definition and helper exports.
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`: owns the analog clock definition while preserving the existing live-visual seam.
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`: owns the calendar-sheet definition while preserving the existing live-visual seam.
- `packages/cli/src/builtin-addons/date-time/format.ts`: centralizes the explicit Day.js formatter contract.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: proves the split addon and mounted render path through the real addon index.
- `packages/cli/package.json`: declares `dayjs` as the formatter dependency.

## Decisions made
- Kept the first Day.js rollout intentionally narrow to core token behavior only; no plugin-backed advanced or localized token families were added silently.
- Preserved richer analog/calendar inline styles where they are still outside the narrow simple-utility debt target, instead of forcing a broader styling rewrite into this slice.
- Preserved the user's pre-existing TSX changes in `buttons/date-time.tsx` and only replaced the formatter internals around them.

## Deviations
- `pnpm install --lockfile-only --filter sireno-deck-cli` updated the lockfile but did not materialize `dayjs` in `node_modules`, so the task needed a follow-up `pnpm install --filter sireno-deck-cli` before the verify commands could actually import the dependency.
- Because `packages/cli/package.json` and `pnpm-lock.yaml` already had unrelated user changes, only the minimal `dayjs` hunks were staged into the task commit via cached patch application.

## Notes for downstream
- The shipped `date_format` / `time_format` contract is now explicitly Day.js syntax. If future work wants localized or advanced Day.js token families, it must add the required plugins and say so honestly in tests/docs instead of relying on accidental support.
- The addon index still re-exports `formatDigitalDateTimeLabel`, `formatLockedTimeCharacters`, and `formatLockedTimeTileCharacter`, so downstream code/tests can keep using the stable helper surface.
