# Plan 31-02 Summary

**Completed:** 2026-05-30

## What was built
Phase 31's second slice re-synchronized the repo-owned guardrails around the repaired `cli:dev` runtime seam. The shipped regression in `start.test.ts` now matches the new launcher-based contract instead of the stale direct-entrypoint script shape, and the README now documents both halves of the live behavior: bare `pnpm run cli:dev` defaults to `start --config config.yml`, while explicit forwarded args such as `pnpm run cli:dev emulate --port 8912` restart the real emulator command through the same watch seam.

## Key files
- `packages/cli/src/cli/commands/start.test.ts`: pins the repaired root-script contract, including default-start argv resolution, forwarded-args passthrough, and the guard that `cli:dev` is not the `tsdown --watch` seam.
- `README.md`: documents the repaired watch contract for both bare and forwarded invocations while preserving the distinction from the daemon's in-process config-owned reload path.

## Decisions made
- Kept the regression seam anchored on the real root script contract, but moved the argv-specific assertions onto the repo-owned launcher helper rather than pretending the root script string still contains `start --config config.yml` inline.
- Expanded the README only enough to document the forwarded-args example; no new workflow or watch-graph behavior was introduced.

## Deviations
- None.

## Notes for downstream
- Full phase verification should prove the launcher tests, the shipped regression seam, and the README wording together, because Phase 31 is specifically about keeping runtime, docs, and regression truth in sync.
