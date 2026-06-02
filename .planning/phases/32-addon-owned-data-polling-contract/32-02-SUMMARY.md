# Plan 32-02 Summary

**Completed:** 2026-06-01

## What was built
Plan 32-02 migrated system-status into an addon-owned polling domain. Canonical metric collection and display mapping moved from core `/system/*` modules into addon-local domain modules, and both shipped system-status buttons were refactored to consume poll payloads from render props. Cadence defaults are now owned by system-status addon schemas with explicit `poll_interval_ms` and `render_interval_ms` defaults.

## Key files
- `packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts`: addon-owned canonical metrics collection.
- `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts`: addon-owned display formatting/mapping.
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx`: payload-first render path with addon-owned poll/render cadence defaults.
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`: payload-first render path with preserved tap/hold behavior.
- `packages/cli/src/builtin-addons/system-status/schemas.ts`: cadence defaults/validation moved to addon schema ownership.
- `packages/cli/src/builtin-addons/system-status/index.test.ts`: updated schema/default and domain-import seam coverage.

## Decisions made
- Seeded store state during activation for stable first-frame behavior while payload polling warms up.
- Preserved unavailable metric visibility in place instead of dropping missing rows.
- Kept host-context core seam usage unchanged; only capability/domain ownership moved.

## Deviations
- During migration, the bars footer text block was accidentally not rendered; a focused failing test caught it and the footer was restored in the same plan.

## Notes for downstream
- System-status no longer depends on core capability modules; Wave 4 can safely remove the old core system-status seams.
