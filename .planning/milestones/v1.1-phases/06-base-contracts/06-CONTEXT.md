# Phase 6: Base Contracts - Context

**Gathered:** 2026-05-14
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 restores the live refresh contract for the built-in digital `date-time` button and makes the existing custom render elements first-class in TypeScript authoring. This phase extends the current addon/runtime/reconciler contracts without changing the renderer model, moving scheduling out of core, or introducing new visual capabilities beyond the digital date/time fix.

</domain>

<decisions>
## Implementation Decisions

### JSX Typing Surface
- Typed JSX should be an explicit addon opt-in, not a repo-wide ambient JSX change.
- The opt-in should be delivered through a dedicated exported types entrypoint rather than mixed into the main addon runtime API.
- Phase 6 should type only the existing intrinsic elements and current props: `deck-button`, `deck-text`, and `deck-surface`.
- The typed JSX authoring contract should be shared by both built-in addons and external addons.

### Refresh Override Contract
- `interval_ms` should override `defaultIntervalMs` when both are present.
- Any button may opt into polling via `interval_ms`; override support is not restricted only to definitions that already declare `defaultIntervalMs`.
- Invalid or too-small `interval_ms` values should fail config validation rather than being clamped silently at runtime.
- Phase 6 should keep a `500ms` minimum for `interval_ms` because the current scheduler jitter can drive effective delays far below the configured value at smaller intervals.

### Agent's Discretion
- The exact packaging and naming of the dedicated JSX types entrypoint can be chosen during planning as long as it stays separate from the main runtime API surface.
- The exact validation wording and schema location for the `interval_ms` minimum can be chosen during planning as long as the policy remains explicit and user-visible.

</decisions>

<specifics>
## Specific Ideas

- Keep JSX support narrow and boring in Phase 6: type what already exists rather than using this milestone as an excuse to predeclare future render props.
- Treat `interval_ms` as a real runtime contract, not dead config baggage.
- The digital `date-time` button should start refreshing correctly through core scheduling rather than relying on incidental re-renders.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/core/schemas.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/scheduler.ts`
- `builtin-addons/date-time/src/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/reconciler.ts`: already exposes helper constructors for the custom render elements; this is the typing seam for explicit JSX support.
- `packages/cli/src/deck/runtime.ts`: already owns scheduler creation, instance refresh, and re-rendering; this is where `interval_ms` and `defaultIntervalMs` must be reconciled.
- `packages/cli/src/core/schemas.ts`: already carries `interval_ms` through parsed button instances, so config already has part of the needed shape.
- `builtin-addons/date-time/src/index.ts`: current digital date/time rendering path; it renders from `new Date()` but does not currently declare a default polling cadence.

### Established Patterns
- Addon buttons are stateful instances that return React elements and rely on core-owned methods such as `invalidate()` and navigation helpers.
- Scheduling remains a core runtime concern rather than an addon-local timer concern.
- The renderer contract is intentionally narrow and custom; intrinsic element typing should preserve that model instead of replacing it with a component abstraction.

### Integration Points
- JSX typing work connects the TypeScript authoring layer to the existing `createElement("deck-button")` / `createElement("deck-text")` / `createElement("deck-surface")` reconciler contract.
- Refresh override work connects config validation in `packages/cli/src/core/schemas.ts` to scheduler startup in `packages/cli/src/deck/runtime.ts`.
- The date-time fix connects the built-in addon definition to runtime polling through `defaultIntervalMs` and/or the validated `interval_ms` override contract.

</code_context>

<deferred>
## Deferred Ideas

- Future render props for text behavior or shared wrappers belong to Phase 7, not this phase.
- Any scheduler redesign needed to safely support sub-500ms refresh intervals belongs to later work, not this phase.

</deferred>

---
*Phase: 06-base-contracts*
*Context gathered: 2026-05-14*
