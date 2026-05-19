# Phase 9: Calendar + Authoring Clarity - Context

**Gathered:** 2026-05-16
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 completes the milestone by adding a readable `calendar-sheet` visual to the built-in date/time addon and shipping docs/examples that make the custom JSX authoring model feel intentional rather than mysterious. This phase should reuse the narrow render and scheduler contracts already validated by Phases 6-8 instead of turning calendar rendering or addon authoring into a renderer redesign.

</domain>

<decisions>
## Implementation Decisions

### Calendar layout
- The calendar should be a tear-sheet, not a month grid.
- The tear-sheet should use a large day number with small weekday and month context.
- The visual should stay readable on a single Stream Deck key and remain distinct from the digital date/time and analog clock visuals.

### Refresh cadence
- `calendar-sheet` should default to `60000ms`.
- Core runtime scheduling remains the only timing owner.
- `interval_ms` remains the supported per-button override path.

### Render contract usage
- The calendar should stay inside the existing `deck-button` seam.
- Phase 9 should add a dedicated `variant: "calendar-sheet"` path rather than introducing new render nodes or forcing the visual through the shared wrapper.
- The shared wrapper remains optional, and the calendar may bypass it.

### Authoring clarity docs
- Ship one focused docs page plus one explicit addon-style example.
- The docs must explain clearly that `deck-button`, `deck-text`, and `deck-surface` target the Sireno renderer contract rather than the DOM.
- The docs should show both the explicit JSX opt-in path and the helper-based alternative in a way that maps to the current package API.

### Verification shape
- Phase 9 should include:
  - an addon-definition test for the separate `calendar-sheet` type and default cadence
  - a renderer test for the tear-sheet calendar visual path
  - a committed review fixture for manual verification
  - docs/example verification that the shipped authoring explanation and example are present and accurate

### Agent's Discretion
- Exact tear-sheet geometry and typography usage.
- Exact config/schema fields for `calendar-sheet`, as long as it remains separate from the digital and analog types.
- Exact docs/example file layout.

</decisions>

<specifics>
## Specific Ideas

- Reuse the successful Phase 8 pattern: one more bespoke `deck-button` variant rather than broader renderer primitives.
- Keep the day number visually dominant and keep supporting text minimal.
- Make the docs page concrete and example-driven, not just conceptual prose.
- Use the Phase 6 JSX entrypoint and Phase 7 wrapper/text clarifications as the authoring baseline the docs should explain.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/06-base-contracts/06-CONTEXT.md`
- `.planning/phases/07-typography-text-behavior/07-CONTEXT.md`
- `.planning/phases/08-clock-visuals/08-CONTEXT.md`
- `packages/cli/package.json`
- `packages/cli/src/render/jsx.d.ts`
- `packages/cli/src/render/types.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`
- `builtin-addons/date-time/src/index.ts`
- `builtin-addons/date-time/src/index.test.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `builtin-addons/date-time/src/index.ts` already contains the digital and analog button definitions, so `calendar-sheet` should become the third separate bundled button type in the same addon.
- `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` already carry narrow `variant` values through helper and JSX authoring.
- `packages/cli/src/render/text-image.ts` already contains dedicated variant branches, including a bespoke analog-clock branch that proves the renderer can handle a custom visual without new primitives.
- `packages/cli/src/render/jsx.d.ts` and `packages/cli/package.json` already expose the explicit JSX opt-in path that Phase 9 docs should explain clearly.

### Established Patterns
- Built-in visuals live inside bundled addons and use the same runtime path as external addons.
- Scheduler ownership stays in core, never in addon-local timers.
- The render contract remains narrow and non-DOM-like.
- The shared wrapper is optional and not required for bespoke visuals.

### Integration Points
- `calendar-sheet` should be defined as a separate built-in date/time button type with its own schema and `defaultIntervalMs`.
- The calendar visual should render through `deck-button` plus `variant: "calendar-sheet"` into `packages/cli/src/render/text-image.ts`.
- Docs/examples should connect the explicit JSX opt-in entrypoint (`sireno-deck-cli/jsx`) to the existing custom intrinsic elements and helper APIs.
- Verification should cover both the widget review path and the shipped authoring explanation/example.

</code_context>

<deferred>
## Deferred Ideas

- Month-grid calendar layouts.
- Rich calendar customization beyond the tear-sheet needs.
- Broader custom render primitives or a more DOM-like authoring model.

</deferred>

---
*Phase: 09-calendar-authoring-clarity*
*Context gathered: 2026-05-16*
