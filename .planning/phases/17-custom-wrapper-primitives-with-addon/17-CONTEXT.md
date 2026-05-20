# Phase 17: Custom Wrapper Primitives + Addon-Authored Rendering Variants - Context

**Gathered:** 2026-05-20
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 17 evolves the current wrapper primitive system into a button-shape composition model. Every button should use a core-owned base shape by default so the product keeps one coherent button chrome and interaction language, while addon buttons render only their inner content. Addons may explicitly opt out and render the full button surface themselves when they need the whole space. The phase should stay narrow: one default base shape, a full-surface opt-out flag, and a small set of explicit content helpers. It should not widen into a CSS-like styling engine, shape catalog explosion, or a full migration of every bespoke render variant.

</domain>

<decisions>
## Implementation Decisions

### Terminology And Public Model
- The concept should be renamed from "wrapper" to `buttonShape` in the design language for this phase.
- Phase 17 should not introduce public `shape_id` indirection for the first rollout.
- The default system behavior is one core-owned base button shape applied automatically to all buttons.

### Base Shape Composition
- The default base button shape should render the outer chrome: border, background, color label/chip treatment, and interaction states like tap and hold.
- When a button uses the default base shape, the addon button should render content only, not the full surface.
- The shape/content boundary should stay explicit: shape owns chrome, addon owns the inner content slot.

### Full-Surface Escape Hatch
- Buttons may explicitly opt out of the default base shape and render the entire button surface themselves.
- That opt-out should be a narrow explicit flag, not an omitted shape id and not an addon-specific private convention.
- Missing shape configuration should still mean "use the default base shape," not "no shape."

### First Rollout Scope
- Phase 17 should ship one default base shape plus two explicit content helpers: `icon + label` and `text`.
- Addon buttons should import and use those helpers explicitly rather than getting implicit renderer magic.
- Existing bespoke variants like toggle, metric, media, fan, emoji, calendar-sheet, analog-clock, and the runtime error card should stay on their current bespoke seams for now.
- The first migration target should be the current shared/default text-oriented path, not a full renderer-wide rewrite.

### Contract Boundaries
- Explicit button props such as `background` and `fit` remain authoritative.
- Config-authored references and render/runtime validation should remain early and path-aware, consistent with prior phases.
- The phase should preserve the narrow explicit-contract style established in Phases 13 and 16 rather than reintroducing a broad styling DSL.

### Agent's Discretion
- Exact API and field names for the base-shape opt-out flag and the new content-helper exports.
- Exact internal migration path from current wrapper terminology to the new button-shape terminology in code and docs.
- Exact component boundaries between core-owned shape chrome and addon-authored content helpers.
- Exact first product-visible buttons/addons used to prove the new model.

</decisions>

<specifics>
## Specific Ideas

- The current shared/default path already behaves like a hard-coded base shape inside `packages/cli/src/render/text-image.ts`; Phase 17 should turn that implicit shape into an explicit composition seam.
- The core should provide the base shape and a small helper set, but addon authors should consciously compose them in their own render code instead of depending on hidden renderer conventions.
- Full-surface custom buttons are still needed for cases that genuinely need all available space, so the escape hatch should remain honest and explicit.
- The first release should feel like a better component model for button rendering, not like a rebranded wrapper registry with more string ids.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/13-global-wrapper-style-primitives/13-CONTEXT.md`
- `.planning/phases/16-config-reload-wrapper-polish/16-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/addon/registry.ts`
- `packages/cli/src/core/schemas.ts`
- `packages/cli/src/render/types.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`
- `packages/cli/src/builtin-addons/core-buttons/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/text-image.ts`: already owns the hard-coded shared/default card chrome; this is the clearest existing base-shape seam.
- `packages/cli/src/render/reconciler.ts`: already transports narrow render descriptions and is the likely place to preserve any shape/content boundary metadata.
- `packages/cli/src/render/types.ts`: defines the public render prop contract and is the natural seam for replacing wrapper-oriented fields with the new shape-oriented contract.
- `packages/cli/src/addon/api.ts`: currently restricts wrappers to `wrapper: "shared"`; this is the public addon contract seam that Phase 17 must evolve.
- `packages/cli/src/addon/registry.ts`: already handles primitive registration and remains the registry seam if any button-shape metadata still needs registration.
- `packages/cli/src/builtin-addons/core-buttons/index.ts`: currently registers the bundled shared-card primitive and is the likely place to define the first bundled base shape and helper usage.

### Established Patterns
- The codebase prefers narrow explicit contracts over broad style systems.
- Shared/default behavior lands first; bespoke variants only migrate when reuse is low-risk.
- Early config/runtime validation is preferred over late renderer failures.
- Built-in and addon surfaces should follow the same addon contract path when practical.

### Integration Points
- The Phase 17 contract will likely connect addon-facing render APIs in `packages/cli/src/addon/api.ts` with render-description transport in `packages/cli/src/render/reconciler.ts`.
- The current shared/default card implementation in `packages/cli/src/render/text-image.ts` is the most likely implementation seed for the new core-owned base shape.
- Any explicit full-surface opt-out must connect config/schema/runtime handling in `packages/cli/src/core/schemas.ts` and the button render pipeline.
- The first explicit content helpers will likely connect core-owned render utilities with bundled addon button implementations in `packages/cli/src/builtin-addons/core-buttons/`.

</code_context>

<deferred>
## Deferred Ideas

- A public `shape_id` catalog in the first rollout.
- A large built-in library of button shapes beyond the default base shape.
- Immediate migration of bespoke variants like toggle, media, metric, fan, emoji, calendar-sheet, analog-clock, or the runtime error deck.
- Any CSS-like styling system or broad visual DSL.

</deferred>

---
*Phase: 17-custom-wrapper-primitives-with-addon*
*Context gathered: 2026-05-20*
