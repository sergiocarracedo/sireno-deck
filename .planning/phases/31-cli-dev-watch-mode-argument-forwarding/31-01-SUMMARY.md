# Plan 31-01 Summary

**Completed:** 2026-05-30

## What was built
Phase 31 started by repairing the actual runtime seam the user runs: the workspace-root `cli:dev` command no longer points directly at the raw CLI entrypoint with no truthful default command. Instead, the repo now has one narrow `dev-watch` launcher that preserves the existing `tsx watch` raw-source seam, resolves bare invocation to the documented `start --config config.yml` path, and still passes explicit forwarded args such as `emulate --port 8912` through untouched.

## Key files
- `package.json`: repoints `scripts.cli:dev` from the broken raw entrypoint shape to the narrow launcher.
- `packages/cli/src/cli/dev-watch.ts`: owns the runtime argv-resolution contract for default-start vs forwarded-args behavior.
- `packages/cli/src/cli/dev-watch.test.ts`: proves the launcher resolves bare and forwarded argv truthfully without introducing a second workflow.

## Decisions made
- Kept `tsx watch` and the existing include graph intact because there was no evidence the watcher contract itself was broken.
- Put the contract repair in one tiny launcher module instead of opaque shell quoting, so the default-start and passthrough behavior is reviewable and directly testable.
- Kept the launcher focused on argv resolution only; it does not add a new command surface or any extra reload semantics.

## Deviations
- None.

## Notes for downstream
- Plan `31-02` should pin this repaired behavior in the existing shipped `start.test.ts` regression seam and update README wording so docs/tests/runtime all say the same thing.
