# Quick Task 024 Summary

**Task:** Done in 78ms Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/works/opensource/sireno-deck/packages/cli/src/cli/index.js' imported from /works/opensource/sireno-deck/packages/cli/src/cli/dev-watch.ts
**Completed:** 2026-06-02

## What was done
Fixed the raw-source `cli:dev` launcher so `dev-watch.ts` imports the real source CLI entrypoint instead of assuming a built sibling `index.js` exists next to it. Added a focused regression in `dev-watch.test.ts` and verified the full `dev-watch` suite passes.

## Files changed
- `packages/cli/src/cli/dev-watch.ts`: switched the dynamic import from `./index.js` to `./index.ts` for the source-run watch seam.
- `packages/cli/src/cli/dev-watch.test.ts`: added regression coverage that locks the source entry import contract.

## Commit
`1a68c57`
