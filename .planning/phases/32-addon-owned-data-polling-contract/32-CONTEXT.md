# Phase 32: Addon-Owned Data Polling Contract - Context

**Gathered:** 2026-06-01
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the runtime contract so addon-specific polling/data-fetching logic is owned by addons, while core runtime stays capability-agnostic and only schedules callback execution, provides runtime methods/context, and transports rendered frames to emulator/hardware.

</domain>

<decisions>
## Implementation Decisions

### Core vs Addon Ownership
- Core runtime must be capability-agnostic.
- Core owns scheduling, button/addon store lifecycle, runtime methods, host context propagation, and render transport only.
- Addon-specific domains (system metrics, media controller behavior, display mappers, domain schemas) move out of core-owned `packages/cli/src/system/*` capability modules.
- Capability-specific typed data contracts belong to addon-owned modules (or addon-shared libraries), not core API types.

### Polling Contract Shape
- Phase 32 should support split intervals for data polling vs render cadence.
- Addon schemas own interval fields/defaults and validation; core consumes resolved schedule values only.
- Data flow is callback-payload based: addon callback returns typed payload, core stores latest payload per button instance, and core passes payload into render props.
- Render should not perform direct domain data fetching as the primary contract path.

### Cross-Platform Adapter Placement
- Linux/macOS/Windows capability adapters should live inside addon domains (or addon-shared non-core modules), not core runtime `/system` capability seams.

### Migration Strategy
- User selected big-bang migration rather than bridge-first migration.
- Planning must therefore include strong regression and verification gates because compatibility buffering is intentionally minimized.

### Agent's Discretion
- Exact naming of new addon-owned callback hooks and payload prop keys.
- Exact split-interval config field names and default values.
- Exact folder/package structure for addon-local shared utilities.
- Exact decomposition strategy for removing or shrinking current `packages/cli/src/system/*` capability modules while keeping core runtime generic.

</decisions>

<specifics>
## Specific Ideas

- Desired runtime flow captured from user direction:
  - core interval triggers addon/button callback
  - callback returns typed data object
  - core passes returned data into button props
  - button rerenders
  - core publishes rendered frame to hardware/emulator
- User wants system-status and media-player capability logic moved from core-owned domain modules into addon-owned seams.
- User explicitly raised render interval vs polling interval decoupling and wants this discussed/planned as part of the phase contract.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`
- `.planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/system/live-metrics.ts`
- `packages/cli/src/system/system-status.ts`
- `packages/cli/src/system/media-controller.ts`
- `packages/cli/src/system/linux-media-controller.ts`
- `packages/cli/src/system/macos-media-controller.ts`
- `packages/cli/src/system/windows-media-controller.ts`
- `packages/cli/src/builtin-addons/system-status/index.ts`
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx`
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`
- `packages/cli/src/builtin-addons/media-player/index.ts`
- `packages/cli/src/builtin-addons/media-player/button.tsx`

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/api.ts` already provides mounted button lifecycle seams (`defaultIntervalMs`, `refresh`, `onPress`, `onRelease`, `onTap`) and runtime props/store methods that can support addon-owned polling callbacks.
- `packages/cli/src/deck/runtime.ts` already centralizes scheduling and render transport, which matches the desired core responsibility boundary.

### Established Patterns
- Phase 30 introduced capability modules in `packages/cli/src/system/*` that currently encode addon-specific logic for system-status/media-player; this is the primary ownership drift being corrected.
- Built-in addons already render through addon button definitions, so moving capability adapters/mappers into addon-owned modules is structurally feasible without changing the mounted render transport model.

### Integration Points
- System-status built-ins currently depend on `packages/cli/src/system/live-metrics.ts` and `packages/cli/src/system/system-status.ts`.
- Media-player built-ins currently depend on `packages/cli/src/system/media-controller.ts` and OS adapter files under `packages/cli/src/system/`.
- Phase 32 planning should define where these dependencies move and how runtime props carry callback payloads into render while keeping core capability-agnostic.

</code_context>

<deferred>
## Deferred Ideas

- Extending phase scope into new end-user capabilities beyond ownership/polling contract refactor.
- Reopening `cli:dev` workflow concerns from Phase 31 unless directly required by Phase 32 implementation/testing.

</deferred>

---
*Phase: 32-addon-owned-data-polling-contract*
*Context gathered: 2026-06-01*
