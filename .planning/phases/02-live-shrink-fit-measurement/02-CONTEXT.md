# Phase 2: Live Shrink-Fit Measurement - Context

**Gathered:** 2026-05-28
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 replaces the current fake CSS-only `fit="shrink"` behavior with honest live measurement on the browser render path so shared `Text` surfaces seek the largest readable size that still fits within the available box. This phase stays narrow: measurement only applies to `fit="shrink"`, mounted/static render paths do not pretend to measure, and the phase does not widen into generic text-layout rewrites, theme-configurable shrink behavior, or Phase 3 rich-formatting work.

</domain>

<decisions>
## Implementation Decisions

### Measurement Ownership
- `Text` remains the public contract owner for `fit="shrink"`.
- Live shrink-fit measurement only activates on the browser DOM render path.
- Mounted/static render paths must degrade honestly instead of faking live measurement.
- The current `.sireno-text-fit-shrink` CSS clamp should stop being the primary shrink logic.
- Phase 2 measurement stays limited to `fit="shrink"`; `wrap`, `ellipsis`, and `marquee` remain declarative.

### Post-Floor Behavior
- The readable minimum floor is still part of the shared shrink-fit contract, but the shipped Phase 2 fallback after that floor is reached is `ellipsis`.
- Configurable floor/fallback selection is explicitly deferred to a later phase rather than added as new public API in Phase 2.
- Reuse the existing explicit `wrap` behavior only for `fit="wrap"`; shrink-fit itself should not introduce a second configurable fallback surface in this phase.

### Recompute Triggers
- Remeasure when text content changes.
- Remeasure when the available container size changes.
- Treat typography/size/theme-driven metric changes as content-affecting inputs that require a fresh measurement.
- Guard aggressively against resize-observer feedback loops by only applying meaningful size changes through a loop-safe scheduling path.

### Rollout Scope
- The first measured rollout lands on shared `Text fit="shrink"` surfaces only.
- Phase 2 should not force bespoke visual variants onto a broader layout rewrite.
- Browser-path regression coverage plus at least one reviewable fixture should make the measured behavior visible.
- Mounted/static outputs must be tested for honest degradation rather than fake browser parity.

### Agent's Discretion
- Exact browser-path measurement seam and helper placement, as long as it does not leak live layout machinery into mounted/static output.
- Exact readable minimum floor value and search strategy for finding the largest fitting size.
- Exact ResizeObserver/requestAnimationFrame guard strategy used to avoid feedback loops.
- Exact regression and fixture shape used to make content-change, container-change, and non-browser degradation behavior observable.

</decisions>

<specifics>
## Specific Ideas

- `packages/cli/src/ui/Text.tsx` already owns the canonical `fit` contract, so Phase 2 should deepen that seam rather than inventing a second shrink API.
- `packages/cli/src/render/theme-utilities.ts` still uses `.sireno-text-fit-shrink{font-size:clamp(...)}`, which is the fake seam this phase needs to replace.
- `packages/cli/src/render/dom-host.tsx` and the browser deck document path are the truthful place for live layout behavior because mounted/static HTML output has no real layout box to measure.
- `packages/cli/src/ui/theme-presentation.tsx` already separates DOM and mounted presentation contexts, which reinforces the browser-only measurement boundary.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/12-backgrounds-text-fitting/12-CONTEXT.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `packages/cli/src/ui/Text.tsx`
- `packages/cli/src/render/theme-utilities.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/dom-host.test.tsx`
- `packages/cli/src/ui/theme-presentation.tsx`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/themes/default/ButtonFrame.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/ui/Text.tsx`: canonical `fit` / `size` / `typography` seam that Phase 2 must preserve while making shrink-fit honest.
- `packages/cli/src/render/theme-utilities.ts`: current utility stylesheet source of truth, including the fake shrink clamp that Phase 2 should replace.
- `packages/cli/src/render/dom-host.tsx`: browser-render boundary where live layout behavior can be attached without polluting mounted/static output.
- `packages/cli/src/ui/theme-presentation.tsx`: already separates mounted and DOM presentation seams, reinforcing the browser-only measurement boundary.
- `packages/cli/src/render/dom-host.test.tsx`: existing focused browser-path regression surface for theme utility and text metadata behavior.

### Established Patterns
- Phase 12 locked text fitting as a narrow explicit render contract rather than a broad visual-system rewrite.
- Phase 28 locked `Text` as the canonical text surface and themes as presentation-only observers, not semantic owners.
- Phase 1 just removed dishonest implicit typography sizing; Phase 2 should preserve that explicitness rather than adding hidden secondary sizing rules.

### Integration Points
- Replace the CSS-only shrink illusion in `theme-utilities.ts` with browser-path live sizing tied back to the canonical `Text` seam.
- Keep theme presentation metadata truthful without shifting shrink semantics into `ThemeText` wrappers.
- Verification must cover content changes, container changes, and honest non-browser degradation without introducing resize-observer loops.

</code_context>

<deferred>
## Deferred Ideas

- User-configurable shrink fallback selection.
- User-configurable readable minimum floor.
- Broader measurement across `wrap`, `ellipsis`, or `marquee`.
- Mounted/static-path measurement parity.
- Rich date-time formatting or any other Phase 3 capability.

</deferred>

---
*Phase: 02-live-shrink-fit-measurement*
*Context gathered: 2026-05-28*
