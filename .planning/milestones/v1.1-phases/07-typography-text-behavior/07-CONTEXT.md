# Phase 7: Typography + Text Behavior - Context

**Gathered:** 2026-05-14
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 replaces the remaining hardcoded text styling and accidental overflow behavior in the shared renderer with an explicit, theme-driven contract. The phase should stay narrow: establish the minimum typography tokens and shared wrapper/text props needed for reusable button rendering without turning this milestone into a broad design-system rewrite or forcing bespoke visuals through one shell.

</domain>

<decisions>
## Implementation Decisions

### Theme Typography Contract
- Theme typography should be theme-driven rather than hardcoded in SVG templates.
- The first Phase 7 contract should use three semantic typography roles only:
  - main text
  - auxiliary text
  - monospace
- These roles should be real typography tokens rather than a single font-family string.
- Planning may choose the exact token fields under each role, as long as the roles are broad enough for current shared renderer text output.

### Overflow Behavior Contract
- Text overflow behavior must be explicit rather than accidental.
- The only approved overflow behavior for Phase 7 is clipping.
- Phase 7 should not implement ellipsis or marquee as user-visible text behaviors unless planning explicitly reopens that scope.

### Shared Wrapper Scope
- The renderer should expose a shared button wrapper primitive that buttons can opt into.
- The shared wrapper must remain optional.
- Analog clock and other bespoke visuals in later phases must remain free to bypass the wrapper.
- The wrapper should consume the shared typography contract instead of carrying hardcoded font decisions locally.

### Marquee Timing Contract
- If marquee is ever introduced later, declaring marquee should be allowed to imply a core-managed refresh cadence rather than requiring each button to already have its own cadence.
- Because Phase 7 currently approves `clip only`, this timing decision is not actionable scope unless planning intentionally reserves space for future marquee support.

### Agent's Discretion
- Exact field names for the three typography roles.
- Exact render prop/API shape for the optional wrapper and explicit clip behavior.
- Whether future marquee timing is recorded as a deferred note or a reserved forward-compatibility constraint in the plan.

</decisions>

<specifics>
## Specific Ideas

- Reuse the Phase 6 `packages/cli/src/render/types.ts` seam when expanding render props.
- Replace the repeated inline `font-family`, `font-size`, `font-weight`, and `letter-spacing` values in `packages/cli/src/render/text-image.ts` with shared theme-driven helpers.
- Keep the render-surface expansion minimal: extend existing `deck-button` and `deck-text` props only where the shared contract truly needs it.
- Make clipping a declared contract that tests can assert directly instead of relying on incidental SVG cropping.

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
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/render/types.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`
- `builtin-addons/date-time/src/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/types.ts` is now the cleanest seam for expanding `deck-button` and `deck-text` props without coupling type-only consumers to the full reconciler implementation.
- `packages/cli/src/config/theme.ts` is still color-only today, so typography expansion should route through that schema boundary.
- `packages/cli/src/render/text-image.ts` currently hardcodes `IBM Plex Sans` and inline text sizing/weight/letter-spacing in multiple SVG builders; this is the main implementation hotspot for Phase 7.
- `packages/cli/src/addon/api.ts` already injects the resolved theme into addon button instances, so built-in and external addons can consume the same theme-driven typography contract.

### Established Patterns
- Rendering contracts stay intentionally narrow and custom rather than DOM-like.
- Addon buttons remain stateful instances that render React elements while core owns refresh scheduling.
- The shared wrapper is meant to be a reusable primitive, not a mandatory shell for every visual.

### Integration Points
- Typography tokens connect theme loading in `packages/cli/src/config/theme.ts` to shared SVG text output in `packages/cli/src/render/text-image.ts`.
- Shared wrapper and explicit clip behavior connect render prop modeling in `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` to the image renderer.
- Later analog-clock and calendar-sheet work should be able to reuse typography tokens where appropriate while bypassing the wrapper when the visual demands it.

</code_context>

<deferred>
## Deferred Ideas

- Ellipsis as a user-visible shared overflow mode.
- Marquee as a user-visible shared overflow mode.
- Any scheduler work needed to support marquee animation cadence beyond today's button refresh model.

</deferred>

---
*Phase: 07-typography-text-behavior*
*Context gathered: 2026-05-14*
