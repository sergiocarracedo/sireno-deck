# Plan 32-01 Summary

**Completed:** 2026-06-01

## What was built
Plan 32-01 landed the core runtime contract for addon-owned polling payloads with split poll/render cadence. Mounted addon button definitions now support a `poll` callback that returns typed payloads, and runtime render props receive the latest payload snapshot. Core runtime scheduling was split into independent polling and render loops per active button while staying capability-agnostic.

## Key files
- `packages/cli/src/addon/api.ts`: adds payload-aware mounted button contract (`poll`, split cadence defaults, payload render prop).
- `packages/cli/src/deck/runtime.ts`: implements payload storage, separate poll/render schedulers, cadence resolution, and legacy-safe render fallback.
- `packages/cli/src/core/schemas.ts`: adds generic envelope cadence fields (`poll_interval_ms`, `render_interval_ms`) without capability-specific semantics.
- `packages/cli/src/deck/runtime.test.ts`: adds focused regressions for payload handoff, split cadence independence, and poll error handling.

## Decisions made
- Kept core payload storage typed as `unknown` so capability-specific types remain addon-owned.
- Preserved legacy behavior by rendering from the poll loop when no explicit render cadence is configured.
- Verified behavior by observable ordering/payload flow, not exact timer precision.

## Deviations
- Full `runtime.test.ts` initially exposed two pre-existing failures unrelated to the new contract; Wave 4 closed those separately.

## Notes for downstream
- System-status and media-player migrations can now consume payload-first render props without direct render-time capability fetching.
