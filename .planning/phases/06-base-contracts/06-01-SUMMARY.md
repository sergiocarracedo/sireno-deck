# Plan 06-01 Summary

**Completed:** 2026-05-14

## What was built
Phase 6 now has an explicit JSX authoring path for addon render elements. The CLI package exports a dedicated `./jsx` entrypoint, the custom intrinsic element typings are isolated from the reconciler runtime logic, and the repo contains both runtime tests and a standalone addon-style fixture proving that JSX usage is explicit opt-in rather than ambient.

## Key files
- `packages/cli/package.json`: exports the dedicated `./jsx` entrypoint.
- `packages/cli/src/render/jsx.d.ts`: declares `deck-button`, `deck-text`, and `deck-surface` for React JSX consumers.
- `packages/cli/src/render/types.ts`: isolates shared render prop interfaces from the reconciler implementation.
- `packages/cli/src/render/reconciler.test.tsx`: verifies helper-authored and JSX-authored render output match.
- `packages/cli/fixtures/phase-6/jsx-addon-explicit-opt-in.tsx`: addon-style fixture proving explicit opt-in usage.
- `packages/cli/fixtures/phase-6/tsconfig.jsx-opt-in.json`: standalone fixture compiler config for isolated typechecking.

## Decisions made
- Extracted render prop interfaces into `packages/cli/src/render/types.ts` so the JSX typing surface could be consumed without dragging the full reconciler dependency graph into standalone typechecks.
- Declared the intrinsic elements for both `react` and `react/jsx-runtime` so the `react-jsx` transform used by the package and fixture recognizes the custom tags.

## Deviations
- The plan originally assumed the JSX-authored reconciler test could stay in a `.ts` file. In practice it had to move to `.tsx`, and `packages/cli/vitest.config.ts` had to include `*.test.tsx`, because JSX syntax is not valid in a `.ts` test file.
- The fixture `tsc` verify required a standalone compiler config plus the extracted render prop types to avoid unrelated package type errors influencing the explicit opt-in proof.

## Notes for downstream
- The package now has a cleaner type-only seam in `packages/cli/src/render/types.ts`, which Phase 7 should reuse when expanding the render contract.
- There are unrelated existing worktree changes outside this plan, untouched.
