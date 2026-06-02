# Quick Task 023 Summary

**Task:** make @ alias resolve when running pnpm cli:dev
**Completed:** 2026-06-01

## What was done
Fixed the real workspace-root `cli:dev` seam so `tsx` resolves `@/…` imports against the same package source tree the CLI actually runs. The smallest truthful fix was adding the alias at the workspace-root `tsconfig.json`, because the root `pnpm exec tsx watch ... packages/cli/src/cli/dev-watch.ts` path reads that config rather than `packages/cli/tsconfig.json`.

## Files changed
- `tsconfig.json`: added workspace-root `baseUrl` plus `@/* -> ./packages/cli/src/*` and `sireno-deck-cli -> ./packages/cli/src/index.ts` so the real `tsx` dev/watch seam resolves package source aliases.
- `.planning/quick/023-make-at-alias-work-on-cli-dev/023-PLAN.md`: records the narrow quick-task plan for the root `cli:dev` seam.

## Verification
- `pnpm exec tsx packages/cli/src/cli/dev-watch.ts --help` -> PASS
- `pnpm run cli:dev --help` -> PASS for alias resolution and CLI help output; the watch process stays alive after printing help, so the shell command eventually times out as expected.

## Commit
uncommitted
