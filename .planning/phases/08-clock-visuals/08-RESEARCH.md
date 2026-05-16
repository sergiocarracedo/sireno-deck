# Phase 8 Research

**Phase:** 8 - Clock Visuals
**Date:** 2026-05-15
**Status:** complete

## Don't Hand-Roll

- Do not invent new render node types or DOM-like clock primitives for Phase 8. `08-CONTEXT.md` already narrows the seam to `deck-button` plus `variant: "analog-clock"`, and `packages/cli/src/render/types.ts`, `packages/cli/src/render/reconciler.ts`, and `packages/cli/src/render/text-image.ts` already carry variant-specific rendering cleanly. [VERIFIED: .planning/phases/08-clock-visuals/08-CONTEXT.md, packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, packages/cli/src/render/text-image.ts] [HIGH]
- Do not add addon-local timers or animation loops. The runtime already owns refresh cadence through `button.interval_ms ?? button.definition.defaultIntervalMs`, which is exactly the contract Phase 8 wants to reuse for the analog clock. [VERIFIED: packages/cli/src/deck/runtime.ts, .planning/phases/06-base-contracts/06-VERIFICATION.md] [HIGH]
- Do not build the clock through the shared wrapper unless the renderer naturally benefits from it. Phase 7 explicitly kept the wrapper optional so bespoke visuals like analog clock can bypass it. [VERIFIED: .planning/phases/07-typography-text-behavior/07-CONTEXT.md, .planning/phases/07-typography-text-behavior/07-02-SUMMARY.md] [HIGH]
- Do not over-generalize the SVG path into a scene graph or reusable vector API yet. Sharp already rasterizes SVG input directly, and Phase 8 only needs one additional bespoke branch, not a new abstraction layer. [CITED: https://sharp.pixelplumbing.com/api-constructor] [VERIFIED: packages/cli/src/render/text-image.ts, .planning/phases/08-clock-visuals/08-CONTEXT.md] [HIGH]

## Common Pitfalls

- The obvious failure mode is horizontal-slice planning: one plan for addon schema, one for renderer, one for tests. That would violate the tracer-bullet rule and delay the first demoable analog clock until the very end. Phase 8 should instead land one end-to-end analog-clock slice first. [VERIFIED: workflow plan-phase vertical-slice requirement, .planning/ROADMAP.md] [HIGH]
- The renderer can become clock-specific spaghetti if the analog path is woven through the default text layout instead of isolated as a dedicated branch alongside `fan`, `media`, and `emoji`. The current `text-image.ts` already uses per-variant builders; follow that shape. [VERIFIED: packages/cli/src/render/text-image.ts, .planning/phases/08-clock-visuals/08-DISCUSSION-LOG.md] [HIGH]
- Small SVG clock hands can disappear or read poorly if line endings are left at the default butt cap. MDN documents `stroke-linecap="round"` as the right way to give open line ends visible rounded terminals, which matters at 72x72. [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-linecap] [MEDIUM]
- Circles with invalid or tiny radii simply do not render, so analog-face geometry should stay explicit and conservative rather than derived through fragile math or percentages. [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/circle] [MEDIUM]
- Theme-driven typography regressions already showed that synthetic renderer tests can pass while the real review path fails under librsvg/font behavior. Phase 8 should reuse that lesson: verify the concrete analog-clock review fixture, not only an abstract unit test. [VERIFIED: .planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md] [HIGH]

## Existing Patterns in This Codebase

- Bundled widget buttons live inside their own addon module, with the built-in date/time addon currently exposing a single `date-time` button definition and exporting its default cadence for tests. Phase 8 should extend that same file with a second button definition instead of creating a new addon boundary. [VERIFIED: builtin-addons/date-time/src/index.ts, builtin-addons/date-time/src/index.test.ts] [HIGH]
- Render variants are intentionally modeled as a narrow string union. The renderer already handles `emoji`, `fan`, `media`, `metric`, and `toggle` by branching inside `buildTextSvg()`. `analog-clock` fits that exact seam. [VERIFIED: packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, packages/cli/src/render/text-image.ts] [HIGH]
- Runtime polling already supports the Phase 8 cadence policy without modification in principle: definitions declare `defaultIntervalMs`, configs may override with `interval_ms`, and buttons without either do not poll. [VERIFIED: packages/cli/src/deck/runtime.ts, packages/cli/src/deck/runtime.test.ts, packages/cli/src/core/schemas.ts] [HIGH]
- The repo already tests renderer variants by comparing rendered buffers and region diffs rather than parsing SVG markup. Phase 8 renderer coverage should match that style so the clock visual is protected at the raster-output level. [VERIFIED: packages/cli/src/render/text-image.test.ts] [HIGH]
- Phase 7 established that bespoke visuals may bypass the shared wrapper. That is not just allowed; it is an explicit constraint meant to protect later analog-clock work. [VERIFIED: .planning/phases/07-typography-text-behavior/07-CONTEXT.md] [HIGH]

## Recommended Approach

- Add a second bundled button definition in `builtin-addons/date-time/src/index.ts` with `type: "analog-clock"`, its own strict config schema, and `defaultIntervalMs: 1000`. Keep the schema intentionally narrow for Phase 8, likely only optional style-facing fields if they are truly needed; otherwise start with no extra config beyond the separate type. [VERIFIED: .planning/phases/08-clock-visuals/08-CONTEXT.md, builtin-addons/date-time/src/index.ts] [HIGH]
- Have the analog button instance render a `deck-button` carrying `variant: "analog-clock"` and no text labels. This preserves the existing reconciler/runtime path and honors the pure-analog decision from context. [VERIFIED: .planning/phases/08-clock-visuals/08-CONTEXT.md, packages/cli/src/render/reconciler.ts] [HIGH]
- Extend the variant unions in `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts`, then add one isolated `buildAnalogClockSvg()` path in `packages/cli/src/render/text-image.ts` selected from `buildTextSvg()`. Keep the geometry self-contained: face circle, tick marks if useful, and hour/minute/second hands drawn with basic SVG shapes. [VERIFIED: packages/cli/src/render/text-image.ts] [HIGH]
- Prefer robust SVG primitives over cleverness: `circle` for the face, `line` or short `path` segments for hands/ticks, and `stroke-linecap="round"` for hand legibility at small sizes. Sharp's SVG input support makes this a low-risk extension of the current renderer. [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/circle, https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/line, https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-linecap, https://sharp.pixelplumbing.com/api-constructor] [MEDIUM]
- Verification should be split across three layers because the context explicitly requires all three: addon-definition tests for the separate type and default cadence, renderer tests for analog-clock buffer differences and/or region assertions, and a committed fixture plus UAT note for manual review on the real CLI/device path. [VERIFIED: .planning/phases/08-clock-visuals/08-CONTEXT.md] [HIGH]

## Source Notes

- Web search endpoints were unreliable in this environment during planning, so this research leans on current direct documentation fetches plus repo-specific evidence rather than pretending generic search results were available. [ASSUMED] [HIGH]
