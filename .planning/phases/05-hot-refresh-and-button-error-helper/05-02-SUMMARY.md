# Plan 05-02 Summary

**Completed:** 2026-05-30

## What was built
Phase 5's second slice locked the external `cli:dev` restart seam as a documented and regression-tested source-edit truth instead of letting it drift into accidental behavior. The workspace-root `tsx watch` command is now pinned as the full-process restart path for raw source edits, and the README explicitly distinguishes that seam from the daemon's narrower in-process config-owned reload path.

## Key files
- `packages/cli/src/cli/commands/start.test.ts`: strengthens the `cli:dev` script assertions so the repo keeps treating it as the full-process raw-source restart seam rather than a bundle watch or in-process reload path.
- `README.md`: adds a `Development Refresh` section that explains when to use `pnpm run cli:dev` versus the daemon's in-process config/deck/theme reload seam.

## Decisions made
- Kept the shipped `package.json` and `packages/cli/package.json` scripts unchanged because the external restart seam was already correct; execution only needed stronger proof and documentation.
- Preserved the strict seam boundary from Plan 05-01 by documenting that raw addon/theme/React source edits stay on `cli:dev`, while the in-process daemon reload remains limited to the config-owned graph it already owns.

## Deviations
- The plan listed `package.json` and `packages/cli/package.json` as possible touch points, but execution did not modify them because the existing scripts already matched the Phase 5 contract and focused test coverage was sufficient.
- I briefly combined the README and test proof into one working edit while shaping the slice, then split the work back into separate task-scoped commits so executor atomicity stayed truthful.

## Notes for downstream
- Plan 05-03 should treat the refresh-boundary docs from this slice as the source of truth and avoid introducing any button-error-helper messaging that implies in-process hot reload for arbitrary source modules.
- Focused `vitest` targets remain the reliable verification path for touched seams; broad package runs still surface unrelated pre-existing failures elsewhere in the repo.
