# Plan 05-06 Summary

**Completed:** 2026-05-13

## What was built
The shipped config now states clearly that its local and npm addon declarations are illustrative-only until a user enables them. The addon loader and startup tests also now pin the exact contract that caused UAT confusion: disabled addons are skipped silently, while enabled broken addons still surface warning logs.

## Key files
- `config.yml`: explains that the shipped addon examples are disabled on purpose and will not emit warnings until enabled.
- `packages/cli/src/addon/loader.test.ts`: proves disabled addons are skipped before any path resolution or warning behavior.
- `packages/cli/src/cli/commands/start.test.ts`: keeps the startup warning path explicit for enabled broken addons and protects the no-warning behavior for disabled examples.

## Decisions made
- Kept runtime behavior unchanged because the reported warning gap came from UAT setup drift, not from a loader bug.
- Added explicit test isolation in `start.test.ts` so the new warning-contract coverage does not leak mock call state across cases.

## Deviations
- None.

## Notes for downstream
- Manual UAT for broken-addon isolation should use an actually enabled broken addon; disabled entries are documentation-only by contract.
