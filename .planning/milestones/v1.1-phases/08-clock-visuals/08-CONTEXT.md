# Phase 8: Clock Visuals - Context

**Gathered:** 2026-05-15
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 adds the first richer live visual to the built-in date/time addon by introducing a separate `analog-clock` button type. This phase should validate that the existing addon/runtime/render contracts can support a bespoke visual without broadening the renderer more than necessary or forcing the clock through the shared wrapper created in Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Visual composition
- The analog clock should stay inside the existing `deck-button` render seam.
- Phase 8 should add a dedicated `variant: "analog-clock"` path rather than introducing new render node types or DOM-like primitives.
- The shared wrapper must remain optional, and the analog clock is allowed to bypass it.

### Text usage
- The analog clock should be a pure analog face with no text.
- Phase 8 should not add small labels, date annotations, or mixed analog-plus-digital layouts.

### Live cadence
- The analog clock should use a default live cadence of `1000ms`.
- Core runtime scheduling remains the only timing owner.
- `interval_ms` remains the supported per-button override path.

### Verification shape
- Phase 8 should include:
  - an addon-definition test for the separate `analog-clock` type and its default cadence
  - a renderer test for the analog-clock visual path
  - a committed review fixture for manual verification

### Agent's Discretion
- Exact analog face styling, theme color usage, and geometry details.
- Exact schema fields for the `analog-clock` button type, as long as it remains separate from `date-time`.
- Exact fixture content and UAT wording for the review path.

</decisions>

<specifics>
## Specific Ideas

- Keep Phase 8 narrower than Phase 9: prove one bespoke visual first instead of combining the clock with extra text or calendar semantics.
- Prefer a renderer change that looks like one new visual branch, not a general-purpose vector scene API.
- Reuse the existing live-refresh contract from Phase 6 and the optional-wrapper escape hatch preserved through Phase 7.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/05-addon-system/05-CONTEXT.md`
- `.planning/phases/06-base-contracts/06-CONTEXT.md`
- `.planning/phases/07-typography-text-behavior/07-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/render/types.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`
- `builtin-addons/date-time/src/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `builtin-addons/date-time/src/index.ts` already establishes the built-in date/time addon boundary and the digital widget cadence pattern.
- `packages/cli/src/render/text-image.ts` already contains variant-specific drawing branches, so an analog clock can likely fit as one more bespoke branch without expanding the render model drastically.
- `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` already transport `variant` through the custom render contract.
- `packages/cli/src/deck/runtime.ts` already supports core-owned cadence defaults plus `interval_ms` overrides.

### Established Patterns
- Built-in visuals should live inside bundled addons and use the same registry/runtime path as external addons.
- Scheduler ownership remains in core, never inside addon-local timers.
- The render contract stays narrow and non-DOM-like.
- The shared wrapper remains opt-in, not mandatory.

### Integration Points
- The new `analog-clock` button type should be defined inside `builtin-addons/date-time/src/index.ts` with its own schema and `defaultIntervalMs`.
- The analog render path should flow through `deck-button` plus `variant: "analog-clock"` into `packages/cli/src/render/text-image.ts`.
- Verification should connect addon tests, renderer tests, and committed review fixtures so both contract and real visual review are covered.

</code_context>

<deferred>
## Deferred Ideas

- Clock labels, timezone text, or embedded date text.
- Broader renderer primitives for arbitrary vector scenes.
- Any smoother-than-1s animation cadence or second-hand interpolation.

</deferred>

---
*Phase: 08-clock-visuals*
*Context gathered: 2026-05-15*
