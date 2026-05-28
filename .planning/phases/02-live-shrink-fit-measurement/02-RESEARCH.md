# Phase 2: Live Shrink-Fit Measurement — Research

**Researched:** 2026-05-28
**Phase goal:** Make `fit="shrink"` recompute live in the browser render path so text seeks the largest non-wrapping size while respecting a readable minimum floor.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| Detect meaningful box changes for browser-path shrink-fit | Use `ResizeObserver` on the browser DOM seam, with explicit loop guards | `ResizeObserver` is widely available and specifically intended for reacting to element size changes, but its documented observation-errors guidance warns that resize loops are real and should be guarded with `requestAnimationFrame` deferral and expected-size checks | [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors] |
| Measure whether text still fits the real rendered box | Use actual DOM box/overflow checks in the browser path rather than canvas-only metrics | `getBoundingClientRect()` provides the real border-box dimensions of rendered elements, while canvas `measureText()` only exposes text metrics detached from real DOM wrapping/layout constraints | [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText] |
| Keep this phase honest across browser and mounted/static paths | Activate live shrink measurement only on the browser DOM render path and degrade honestly elsewhere | The live codebase already has separate browser DOM and mounted host seams, so pretending both can measure layout would create fake parity instead of an honest contract | [VERIFIED: `packages/cli/src/render/dom-host.tsx`] [VERIFIED: `packages/cli/src/render/dom-host-button.tsx`] [VERIFIED: `packages/cli/src/ui/theme-presentation.tsx`] |
| Avoid picking a cutting-edge CSS intrinsic-sizing feature as the primary implementation | Do not base Phase 2 on `calc-size()` / `interpolate-size` | Modern guidance surfaces those features as limited-support, progressive-enhancement tools rather than a truthful cross-browser core for this repo’s browser-rendered shrink-fit contract | [VERIFIED: modern-web-guidance retrieve `calculate-with-intrinsic-sizes`] |

## Common Pitfalls

### Keeping `.sireno-text-fit-shrink` as the real shrink implementation
**What goes wrong:** `fit="shrink"` keeps pretending to be live and content-aware even though it is still only a static CSS clamp. [VERIFIED: `packages/cli/src/render/theme-utilities.ts`]  
**Why:** The current implementation hardcodes `.sireno-text-fit-shrink{font-size:clamp(0.7rem,0.45rem + 0.9vw,1rem);}`, which is viewport-ish heuristics, not actual measurement of the rendered text box. [VERIFIED: `packages/cli/src/render/theme-utilities.ts`]  
**How to avoid:** Remove the clamp as primary logic and move shrink-fit truth onto a browser-path measurement seam tied to canonical `Text` behavior. [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`]

### Letting mounted/static output pretend it measured layout
**What goes wrong:** Mounted HTML or static review output appears to promise browser-equivalent shrink-fit decisions that it cannot actually compute. [VERIFIED: `packages/cli/src/render/dom-host.tsx`]  
**Why:** The codebase has distinct DOM and mounted host seams; only the browser path has a live layout box to observe and remeasure. [VERIFIED: `packages/cli/src/render/dom-host.tsx`] [VERIFIED: `packages/cli/src/ui/theme-presentation.tsx`]  
**How to avoid:** Keep `Text` as the public API seam, but only activate measurement in the browser DOM provider path and test honest degradation everywhere else. [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`]

### Creating ResizeObserver feedback loops
**What goes wrong:** The observer repeatedly re-triggers itself while shrink logic mutates the measured element, causing noisy updates or browser observation errors. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors]  
**Why:** Shrink-fit changes font size, which changes box dimensions, which can immediately trigger another observation if changes are not scheduled/guarded carefully. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors]  
**How to avoid:** Treat only meaningful changes as remeasurement inputs, defer writes through a loop-safe path like `requestAnimationFrame`, and track expected/applied size so repeated identical writes are suppressed. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors] [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`]

### Using canvas text width as the primary proof of fit
**What goes wrong:** The algorithm can look correct for single-line width but still disagree with the real DOM box once wrapping, font loading, line metrics, or container styles matter. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText]  
**Why:** `measureText()` returns text metrics in a detached canvas context, not real DOM overflow/wrap state inside the browser-rendered button surface. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText]  
**How to avoid:** Use real DOM measurements/overflow checks as the source of truth for fit, and reserve canvas metrics for debugging or hypothetical future optimization only if ever needed. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect] [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`]

### Widening Phase 2 into a generic fit-system rewrite
**What goes wrong:** `wrap`, `ellipsis`, `marquee`, theme wrappers, or bespoke text variants all get pulled into the same change, making it unclear what actually fixed shrink-fit. [VERIFIED: `.planning/phases/12-backgrounds-text-fitting/12-CONTEXT.md`] [VERIFIED: `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`]  
**Why:** The project has already locked text behavior as a narrow explicit contract and Phase 2 specifically scopes measurement to `fit="shrink"` only. [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`]  
**How to avoid:** Keep `wrap`, `ellipsis`, and `marquee` declarative; apply live measurement only to shared `Text fit="shrink"` surfaces; and prove the result on browser-path regressions plus one reviewable fixture. [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`] [VERIFIED: `.planning/research/SUMMARY.md`]

## Existing Patterns in This Codebase

- **`Text` already owns the public fit contract:** `packages/cli/src/ui/Text.tsx` is the canonical seam for `fit`, `size`, `typography`, and theme metadata threading, so Phase 2 should deepen that contract rather than invent a parallel shrink-fit API. [VERIFIED: `packages/cli/src/ui/Text.tsx`]
- **Browser and mounted rendering are already split cleanly:** `packages/cli/src/render/dom-host.tsx`, `packages/cli/src/render/dom-host-button.tsx`, and `packages/cli/src/ui/theme-presentation.tsx` already distinguish live browser DOM rendering from mounted/static output, which is the correct boundary for browser-only measurement. [VERIFIED: `packages/cli/src/render/dom-host.tsx`] [VERIFIED: `packages/cli/src/render/dom-host-button.tsx`] [VERIFIED: `packages/cli/src/ui/theme-presentation.tsx`]
- **The fake shrink seam is isolated:** `packages/cli/src/render/theme-utilities.ts` already concentrates the current CSS-only shrink behavior into `.sireno-text-fit-shrink`, so Phase 2 can replace one dishonest seam instead of rewriting unrelated typography utilities. [VERIFIED: `packages/cli/src/render/theme-utilities.ts`]
- **Theme wrappers are already positioned as observers, not semantic owners:** `packages/cli/src/themes/default/ButtonFrame.tsx` accepts `fit` on `ThemeTextProps`, but Phase 28 and Phase 1 locked behavior ownership in core `Text`, which should remain true for measured shrink-fit too. [VERIFIED: `packages/cli/src/themes/default/ButtonFrame.tsx`] [VERIFIED: `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`] [VERIFIED: `.planning/phases/01-theme-relative-typography-contract/01-CONTEXT.md`]
- **Browser-path proof already lives in DOM-host regressions:** `packages/cli/src/render/dom-host.test.tsx` is the existing seam for browser utility stylesheet and theme-presented text assertions, so it is the natural regression surface for Phase 2 measurement/degradation behavior. [VERIFIED: `packages/cli/src/render/dom-host.test.tsx`]

## Recommended Approach

Plan Phase 2 as one honest browser-path behavior cut and one proof/hardening cut. First, replace the fake `.sireno-text-fit-shrink` clamp with a browser DOM measurement seam that only activates for canonical `Text fit="shrink"`, remeasures on content/container/theme-metric changes, respects a core-owned readable minimum, and degrades honestly on mounted/static paths. [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`] [VERIFIED: `packages/cli/src/ui/Text.tsx`] [VERIFIED: `packages/cli/src/render/theme-utilities.ts`] [VERIFIED: `packages/cli/src/render/dom-host.tsx`]

Then harden the behavior with focused browser-path regressions and one reviewable fixture that makes the post-floor ellipsis behavior, live remeasurement, and non-browser degradation inspectable without widening into a generic text-layout rewrite. [VERIFIED: `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`] [VERIFIED: `packages/cli/src/render/dom-host.test.tsx`] [VERIFIED: `.planning/research/SUMMARY.md`]
