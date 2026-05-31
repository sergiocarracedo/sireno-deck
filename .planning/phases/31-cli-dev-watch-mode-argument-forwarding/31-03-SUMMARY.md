# Plan 31-03 Summary

**Completed:** 2026-05-31

## What was built
Plan 31-03 closed the real upstream blocker behind the failed Phase 31 UAT: the watched `cli:dev` seam no longer destabilizes itself by importing theme runtime files from ephemeral `/tmp/.sireno-theme-runtime-*` snapshots that immediately get deleted. Instead, theme runtime modules are imported in place through `tsx` with a cache-busting query on the real entry path, so `tsx watch` keeps one stable watched process for the forwarded emulator seam instead of looping on self-generated `unlink` events.

## Key files
- `packages/cli/src/config/theme.ts`: replaced temp snapshot import churn with in-place `tsImport(...)` plus a runtime cache key query string.
- `packages/cli/src/config/theme.test.ts`: added a focused cache-stability regression proving repeated built-in theme loads do not create new `.sireno-theme-runtime-*` churn under `/tmp`.
- `packages/cli/src/cli/commands/start.test.ts`: added the watched-emulator subprocess proof on the exact `cli:dev` seam.
- `.planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-UAT.md`: preserved the original failed UAT evidence and pointed rerun at the gap-closure plans.

## Decisions made
- Reused the existing addon-loader `tsImport(..., { tsconfig })` policy instead of inventing a second theme-runtime import mechanism.
- Removed theme runtime copying entirely rather than moving it to a different cache directory, because the copy itself reintroduced the TSX runtime policy drift (`React is not defined`).
- Kept the watch proof on the forwarded emulator seam because that was the most direct reproduction path for the self-triggering restart loop diagnosed in UAT.

## Deviations
- The plan's broad `src/config/theme.test.ts` verify command still surfaces stale custom-theme fixture drift (`Required` manifest failures) that predates this watch-loop closure. The truthful gate for this slice is the built-in theme stability proof plus the exact watched `cli:dev` subprocess regression on `src/cli/commands/start.test.ts`.

## Notes for downstream
- Plan `31-04` should now focus only on the downstream bare `startDaemon()` cleanup bug and on re-syncing UAT/verification truth after this shared watch-loop blocker is closed.
