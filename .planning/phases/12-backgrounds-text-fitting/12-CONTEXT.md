# Phase 12: Backgrounds + Text Fitting - Context

**Gathered:** 2026-05-18
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 makes the render contract explicit about two things that are currently implicit or missing: background resolution and text fitting behavior. It should introduce one shared background-precedence contract and one narrow named text-fit contract for render surfaces. The phase is not a broad visual-system redesign and should not widen into image-background support, gradient authoring, theme-engine expansion, or a forced rewrite of bespoke visual variants that already own their own layout.

</domain>

<decisions>
## Implementation Decisions

### Background Contract Scope
- Phase 12 backgrounds should be color-only.
- Do not widen this phase into gradient, image, or asset-backed background support.
- The background contract should stay close to the current theme model, which already exposes a single background color token.

### Background Precedence
- Background precedence for this phase should resolve in this exact order:
  - button config override
  - deck background
  - theme background
- The "config override" requirement from the roadmap is now concretely defined as a per-button override rather than a top-level runtime override.
- The same precedence rule should be shared across render paths rather than reinterpreted per variant.

### Text Fitting API
- The render contract should expose named text fitting modes instead of the current implicit clip-only behavior.
- The default fitting mode should be `shrink`.
- The only explicit alternate mode introduced in this phase should be `wrap`.
- Planning should avoid inventing extra modes unless implementation discovers a real blocker.

### Shrink Behavior And Readability Floor
- Default text behavior should shrink to fit first, then clip cleanly once a renderer-owned readable minimum size is reached.
- The minimum readable size should be fixed by the renderer in Phase 12 rather than user-configurable through theme or config.
- Planning should treat that minimum as a contract implementation detail chosen for readability, not a new public customization surface.

### Variant Scope
- The new text-fit contract should apply first to shared/default text paths.
- Bespoke variants do not need to be force-migrated onto the same fitting logic in this phase when they already own custom SVG layout.
- Bespoke variants may adopt the new contract only where it fits naturally without turning Phase 12 into a full render-system rewrite.

### Agent's Discretion
- Exact schema key names for background and text-fit options.
- Exact renderer-owned readable minimum size and the measurement heuristic used to enforce it.
- Exact places where bespoke variants can reuse the new fit/background contract without adding risk.
- Exact test and fixture shape used to make background precedence and wrap behavior observable.

</decisions>

<specifics>
## Specific Ideas

- The current renderer contract only models `overflow?: "clip"`, so Phase 12 should replace that implicit seam with a small explicit fit-mode contract rather than layering more meaning onto `overflow`.
- The current theme model already exposes a single `background` color, which is a good signal to keep this phase color-only instead of overreaching into richer background media.
- The default text path is the right first landing zone because `packages/cli/src/render/text-image.ts` already concentrates the shared label rendering behavior there.
- Bespoke variants like `analog-clock` and `calendar-sheet` should not be dragged through a generic fitting abstraction unless the planner finds a low-risk reuse point.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/11-session-config-contracts/11-CONTEXT.md`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/core/schemas.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`
- `packages/cli/src/render/text-image.test.ts`
- `packages/cli/src/render/types.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/text-image.ts`: owns the shared SVG rendering path and is the main seam for introducing explicit fit-mode behavior plus background resolution for the default/shared visual path.
- `packages/cli/src/render/reconciler.ts`: currently carries `overflow` and wrapper metadata through the render contract, so Phase 12 will likely need to replace or widen that contract here first.
- `packages/cli/src/render/types.ts`: keeps the public render-prop surface narrow and currently defines the clip-only text overflow shape.
- `packages/cli/src/core/schemas.ts`: owns deck/button config validation and is the likely seam for adding validated button-level and deck-level background settings.
- `packages/cli/src/config/theme.ts`: already provides the theme background token that should remain the final fallback in the precedence chain.
- `packages/cli/src/render/text-image.test.ts`: already uses pixel-region comparisons to keep renderer behavior observable, which is the right existing pattern for wrap-vs-shrink and background-precedence verification.

### Established Patterns
- Render contracts are intentionally narrow and explicit.
- The codebase prefers shared core contracts over per-variant fallback rules.
- The current renderer is still mostly hand-positioned SVG, so any new abstraction has to justify its complexity.
- Prior milestone context already established that Phase 12 should settle render-surface contracts before Phase 13 adds global wrapper/style primitives.

### Integration Points
- Background precedence will connect config validation in `packages/cli/src/core/schemas.ts`, render descriptions in `packages/cli/src/render/reconciler.ts`, and final SVG generation in `packages/cli/src/render/text-image.ts`.
- Named text-fit modes will likely replace the current `overflow` contract across `packages/cli/src/render/types.ts`, `packages/cli/src/render/reconciler.ts`, and the render calls in `packages/cli/src/cli/commands/start.ts`.
- Verification should make button-level override, deck fallback, theme fallback, shrink default, and wrap mode all observable through focused renderer tests and at least one shipped fixture path.

</code_context>

<deferred>
## Deferred Ideas

- Gradient backgrounds.
- Image or asset-backed backgrounds.
- Theme-configurable minimum readable font size.
- Forcing every bespoke visual variant onto one generic text-fitting abstraction.
- Broader visual-system redesign beyond the shared Phase 12 contract work.

</deferred>

---
*Phase: 12-backgrounds-text-fitting*
*Context gathered: 2026-05-18*
