# Quick Task 022 Summary

**Task:** add the @ alias to import from src/
**Completed:** 2026-06-01

## What was done
Added a package-local `@/*` alias in `packages/cli` so source imports can resolve from `src/*` without long relative paths. Mirrored the alias in the Vitest resolver so test runtime follows the same import contract as the package TypeScript/build path.

## Files changed
- `packages/cli/tsconfig.json`: added `@/* -> ./src/*` to compiler path aliases while keeping `sireno-deck-cli` unchanged.
- `packages/cli/vitest.config.ts`: added the matching `@` resolver for Vitest runtime imports.

## Verification
- `pnpm --filter sireno-deck-cli run build` -> PASS
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/date-time/index.test.ts` -> FAIL, but not on alias resolution. The suite executes and reaches date-time assertions, which shows `@/themes/utils/cn` resolved; the failing assertions come from pre-existing dirty date-time contract drift (`builtinTimeButton` now exists and `formatDigitalDateTimeLabel` signature expectations are stale).

## Commit
uncommitted
