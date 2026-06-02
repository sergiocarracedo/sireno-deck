# Phase 32 Research — Addon-Owned Data Polling Contract

## Don't Hand-Roll

- Reuse the existing runtime scheduler seam (`createPollingScheduler`) for both poll and render cadence loops instead of introducing a second scheduler subsystem. [VERIFIED: packages/cli/src/render/scheduler.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]
- Reuse the mounted button runtime props/store seam (`MountedAddonButtonRenderProps`) and add payload handoff there, rather than creating capability-specific hooks in core runtime. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]
- Reuse addon-local domain modules for capability logic (system-status/media-player) instead of preserving core-owned `/system/*` domain facades. [VERIFIED: .planning/phases/32-addon-owned-data-polling-contract/32-CONTEXT.md] [VERIFIED: packages/cli/src/system/live-metrics.ts] [VERIFIED: packages/cli/src/system/media-controller.ts]
- Reuse render-time derivation patterns (compute from current props/payload during render) and avoid effect-style state synchronization paths for derived display output. [CITED: https://react.dev/learn/you-might-not-need-an-effect]

## Common Pitfalls

- Do not assume timer precision for cadence correctness.
  - What goes wrong: polling/render loops drift or bunch under event-loop pressure, and plans/tests falsely assume exact interval timing.
  - Why: Node timers do not guarantee exact execution timing.
  - How to avoid: assert ordering/contract semantics (poll callback called, latest payload forwarded, render loop independent) instead of exact millisecond equality. [CITED: https://nodejs.org/api/timers.html]

- Do not let core runtime re-absorb capability domains while adding the payload contract.
  - What goes wrong: core ends up owning metric/media types, formatters, and OS branches again.
  - Why: convenience imports from existing `/system/*` modules mask ownership drift.
  - How to avoid: keep core limited to scheduling, lifecycle/store, runtime methods/host context propagation, and render transport; move capability types/adapters into addon-owned modules. [VERIFIED: .planning/phases/32-addon-owned-data-polling-contract/32-CONTEXT.md]

- Do not couple data fetch cadence to render cadence in the new contract.
  - What goes wrong: high-frequency visual updates force over-polling, or lower polling rates throttle unrelated render updates.
  - Why: the current runtime executes `refresh` and render in one scheduler tick.
  - How to avoid: add explicit independent cadence controls and runtime schedulers for polling vs rendering, with addon schema/default ownership for interval semantics. [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: .planning/phases/32-addon-owned-data-polling-contract/32-DISCUSSION-LOG.md]

## Existing Patterns in This Codebase

- `createDeckRuntime()` already centralizes lifecycle, scheduling, and frame transport and is the right core boundary to keep generic. [VERIFIED: packages/cli/src/deck/runtime.ts]
- Mounted button definitions already expose lifecycle callbacks and a stable render-props shape; this is the narrow seam to extend for payload handoff. [VERIFIED: packages/cli/src/addon/api.ts]
- Built-in `system-status` and `media-player` buttons already keep per-button state in mounted button store scopes, which can hold latest payload snapshots without widening core ownership. [VERIFIED: packages/cli/src/builtin-addons/system-status/buttons/bars.tsx] [VERIFIED: packages/cli/src/builtin-addons/media-player/button.tsx]
- Existing runtime tests already cover interval precedence, refresh behavior, and failure handling, making them the right regression seam for split-cadence contract proof. [VERIFIED: packages/cli/src/deck/runtime.test.ts]

## Recommended Approach

1. Add a core-generic polling payload contract on mounted buttons: a callback returns payload, runtime caches latest payload per button instance, and render props receive that payload. Keep payload typed at addon definition boundaries and `unknown` at runtime internals to preserve core agnosticism. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]
2. Split cadence scheduling into independent poll and render loops in runtime, while keeping scheduler implementation shared. Preserve behavior for buttons that only define one cadence so existing built-ins remain stable. [VERIFIED: packages/cli/src/render/scheduler.ts] [CITED: https://nodejs.org/api/timers.html]
3. Migrate capability modules out of `packages/cli/src/system/*` into addon-owned domains for `system-status` and `media-player`, including OS adapters and display mappers. Update bundled addon schemas to own interval fields/defaults and consume runtime payload props in render. [VERIFIED: .planning/phases/32-addon-owned-data-polling-contract/32-CONTEXT.md] [VERIFIED: packages/cli/src/builtin-addons/system-status/index.ts] [VERIFIED: packages/cli/src/builtin-addons/media-player/index.ts]
4. Execute as big-bang with regression gates on runtime cadence/payload tests plus built-in addon behavior tests, then remove or shrink obsolete core `/system/*` capability files in the same phase. [VERIFIED: .planning/phases/32-addon-owned-data-polling-contract/32-DISCUSSION-LOG.md]

## Research Summary

- The current bug-shaped seam is architectural ownership drift, not missing primitives: core already has lifecycle/store/scheduler infrastructure needed for addon-owned polling. [VERIFIED: packages/cli/src/deck/runtime.ts]
- Node timer guarantees require contract-level tests instead of exact-timing assumptions for split cadence. [CITED: https://nodejs.org/api/timers.html]
- The safest Phase 32 path is a narrow core contract change plus addon-domain migrations for system-status and media-player, with regression-first proof on existing runtime and addon test seams. [VERIFIED: packages/cli/src/deck/runtime.test.ts] [VERIFIED: packages/cli/src/builtin-addons/system-status/index.test.ts] [VERIFIED: packages/cli/src/builtin-addons/media-player/index.test.ts]
