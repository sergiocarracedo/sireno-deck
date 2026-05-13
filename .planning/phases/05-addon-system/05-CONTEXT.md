# Phase 5: Addon System - Context

**Gathered:** 2026-05-13
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Let users install trusted in-process addons from local folders and npm, validate addon manifests, register custom button and deck types, and prove the model with bundled built-in addons and the emoji selector addon. For this phase, button types move to an addon-first architecture so feature-specific button behavior no longer lives inside the core deck runtime.

</domain>

<decisions>
## Implementation Decisions

### Button Contract
- Addon button visuals should return a React element as the canonical v1 render output.
- Button behavior should be implemented as a stateful addon instance created once per configured button, not as a pure stateless render function.
- Addons declare their refresh cadence, but the core runtime owns scheduling, jitter, activation-time refresh, reconnect refresh, and cleanup.
- Core delivers input through explicit event-handler methods on the addon instance rather than a single generic callback.
- Runtime state for a button lives inside the addon instance; core should not own feature-specific button state.
- Core injects an explicit `invalidate()` method so addon instances can request an immediate re-render after internal or async state changes.
- Deck navigation remains core-owned, but addon buttons trigger it through injected navigation methods instead of special-cased runtime logic.

### Schema Ownership
- Core must load addons before full deck/button validation so addon-defined button schemas are available during config validation.
- Addons register Zod schemas for their button payloads in v1.
- Core should replace the current hardcoded button-type union with a generic button descriptor containing a stable envelope plus validated addon-owned config.
- Core owns the common button envelope fields such as position and type; the addon owns the remaining payload schema.

### Runtime Injection
- Addon instances receive validated button config, the resolved theme, button identity, and a minimal read-only app context by default.
- Command execution should go through injected core helpers rather than direct `execa` usage inside addons.
- The v1 addon API should stay small: no generic subscription/cleanup primitive beyond scheduled refresh, input events, explicit invalidation, navigation helpers, command helpers, and instance disposal.
- Inject a small explicit method surface rather than a large capability bag.

### Built-in Migration
- Current built-in button types should become bundled addons using the same contract as external addons.
- Bundled addons and external addons should go through the same loader and registry path.
- The user wants to redesign the button config surface now rather than preserve the current built-in config contract.
- The new user-facing config shape should stay YAML-friendly: a core envelope with addon fields inline in the same button object.
- Phase 5 should focus primarily on button types; custom deck types should follow the same registration and schema principles where possible without forcing a full deck-architecture redesign up front.

### Agent's Discretion
- Exact package/module split between addon loader, addon registry, runtime host, and built-in addon packages.
- Exact naming of the addon instance methods so long as the lifecycle remains explicit and small.
- Exact shape of the minimal read-only app context injected into addons.

</decisions>

<specifics>
## Specific Ideas

- The current `deck/runtime.ts` has too much built-in feature knowledge for CPU, memory, fan, media, and toggle behavior; the Phase 5 design should remove that coupling rather than wrap it in a thinner API.
- The addon contract should treat buttons as the interface between addon code and the core runtime: the addon defines config validation, behavior, and render output; the core owns scheduling, deck lifecycle, rendering to hardware, and navigation state.
- React remains the visual contract, but React alone does not replace the scheduler because live buttons depend on external triggers such as polling, key events, activation, and reconnect.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- .planning/ROADMAP.md
- .planning/REQUIREMENTS.md
- .planning/PROJECT.md
- .planning/phases/03-themes-basic-buttons/03-CONTEXT.md
- .planning/phases/04-advanced-buttons/04-03-SUMMARY.md
- packages/cli/src/core/schemas.ts
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/controller.ts
- packages/cli/src/render/reconciler.ts
- packages/cli/src/render/scheduler.ts
- packages/cli/src/cli/commands/start.ts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/reconciler.ts`: already establishes React as the render contract and should stay the bridge from addon output to render descriptions.
- `packages/cli/src/render/scheduler.ts`: already provides jittered polling and should remain core-owned when addon buttons declare schedules.
- `packages/cli/src/deck/controller.ts`: already centralizes deck navigation and should remain the core navigation boundary behind injected addon methods.
- `packages/cli/src/cli/commands/start.ts`: already wires config loading, theme resolution, device lifecycle, and deck runtime startup; it is the natural integration point for bootstrap addon loading before full config validation.

### Established Patterns
- Validation errors must keep rich file/line/suggestion context through the full config pipeline.
- The codebase prefers building the real architecture instead of temporary demos.
- The current implementation already has a useful split between device lifecycle, scheduler, render bridge, and deck controller; the main coupling problem is feature-specific button behavior in the runtime and schemas.

### Integration Points
- Config loading needs a bootstrap phase that can discover addons before full button validation.
- Addon registration must feed both config validation and runtime button instantiation.
- Deck runtime should become a generic host that manages activation, key events, scheduling, invalidation, and rendering while delegating button behavior to addon instances.
- Built-in button packages should be loaded through the same registry path as external addons to avoid permanent contract drift.

</code_context>

<deferred>
## Deferred Ideas

- A generic subscription/cleanup primitive for external event listeners is deferred until a real addon needs it.
- A full deck-architecture redesign is deferred; Phase 5 should make deck types align with the addon registration model without forcing a complete deck runtime rewrite.

</deferred>

---
*Phase: 05-addon-system*
*Context gathered: 2026-05-13*
