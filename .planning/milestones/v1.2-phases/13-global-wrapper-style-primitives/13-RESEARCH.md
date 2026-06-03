# Phase 13 Research — Global Wrapper/Style Primitives

**Date:** 2026-05-18
**Requirement:** `SCS-05`

## Don't Hand-Roll

- [VERIFIED: codebase] Do not invent a second extension store for primitives. `packages/cli/src/addon/registry.ts` already owns addon-backed global registration for buttons, decks, and assets, so wrapper/style primitives should extend that registry instead of creating a parallel catalog that would drift from addon loading and duplicate collision logic.
- [VERIFIED: https://context7.com/colinhacks/zod/llms.txt] Do not invent custom ad-hoc error plumbing for reference validation when Zod/path-aware refinement patterns already support field-specific failures. The repo already wraps validation issues into `ConfigValidationError` with path segments, so primitive-reference validation should preserve that seam instead of bypassing it.
- [VERIFIED: codebase] Do not broaden the custom renderer into a scene graph or CSS-like styling language. `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` currently carry a small explicit prop surface, and the existing Phase 8 solution explicitly warns against widening bespoke visuals into premature primitives.

## Common Pitfalls

- [VERIFIED: codebase] Validating primitive existence only at image-render time is too late. Config-authored refs currently fail early with line/path context in `packages/cli/src/core/schemas.ts` and `packages/cli/src/config/loader.test.ts`; if Phase 13 waits until `renderTextImage()` to discover bad refs, it loses the strongest diagnostics path and violates the agreed contract.
- [VERIFIED: codebase] Forcing bespoke variants like `analog-clock` or `calendar-sheet` onto the first primitive abstraction will widen the phase into a renderer rewrite. The Phase 8 prior-art solution and current `packages/cli/src/render/text-image.ts` structure both indicate those branches should stay bespoke unless reuse is genuinely low-risk.
- [VERIFIED: codebase] Letting primitive defaults silently override explicit `background` or `fit` values would regress the explicit seams shipped in Phase 12. The current render contract already treats those as intentional public knobs, so primitives must compose underneath them, not replace them.
- [CITED: https://duckduckgo.com/html/?q=plugin+registry+namespaced+ids+validation+best+practices+2026] Non-namespaced registry ids invite collisions and provider confusion. The external namespace guidance aligns with the repo’s existing addon asset key pattern and the user’s chosen global `addon/primitive` direction.

## Existing Patterns in This Codebase

- [VERIFIED: codebase] `packages/cli/src/addon/api.ts` is the public addon contract seam. New primitive definition types should land there so bundled addons and external addons use the same registration surface.
- [VERIFIED: codebase] `packages/cli/src/addon/registry.ts` already handles duplicate registration and addon-owned global names for assets. Extending it with wrapper/style maps is the most honest continuation of the current architecture.
- [VERIFIED: codebase] `packages/cli/src/core/schemas.ts` already resolves config-authored references against the live registry for deck types, button types, and addon assets while preserving readable `ConfigValidationError` metadata.
- [VERIFIED: codebase] `packages/cli/src/render/reconciler.ts` is the transport seam from addon-authored JSX/helper output into runtime render descriptions, and `packages/cli/src/deck/runtime.ts` is the last safe handoff point before image generation for addon-authored render results.
- [VERIFIED: codebase] `packages/cli/src/render/text-image.ts` already has a shared/default visual branch plus bespoke variant branches, which makes it the correct first consumer for primitive-backed wrapper/style behavior on the shared/default path.
- [VERIFIED: codebase] The test style for this repo is already clear: focused registry/config/reconciler tests plus observable renderer diffs in `text-image.test.ts`, then a committed fixture/UAT path for the shipped surface.

## Recommended Approach

- [HIGH][VERIFIED: codebase] Add separate wrapper and style primitive definitions to `packages/cli/src/addon/api.ts` and register them through `packages/cli/src/addon/registry.ts` using global namespaced ids. Treat bundled addons the same as external addons so one contract proves both built-in and addon-owned reuse.
- [HIGH][VERIFIED: codebase] Extend the config/runtime contract with direct `wrapper_id` and `style_id` fields rather than a nested style object. Validate config-authored refs during config loading in `packages/cli/src/core/schemas.ts`, preserving path-specific errors for unknown refs and wrapper/style kind mismatches.
- [HIGH][VERIFIED: codebase] Extend `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` to carry primitive ids through `deck-button` and `deck-surface` button collections. Then add runtime-side validation in `packages/cli/src/deck/runtime.ts` so addon-authored JSX/helper refs fail before `renderTextImage()` runs.
- [HIGH][VERIFIED: codebase] Keep the first primitive consumer on the shared/default branch in `packages/cli/src/render/text-image.ts`. Primitive defaults may supply wrapper/style treatment, but explicit props such as `background`, `fit`, and variant-specific behavior must remain authoritative.
- [MEDIUM][VERIFIED: codebase] Prove the contract with one bundled primitive consumer plus one addon-registered primitive consumed outside addon-local rendering, using focused registry/config/reconciler/render tests and a committed Phase 13 review fixture if the product-visible consumer benefits from manual inspection.
- [MEDIUM][ASSUMED] The most likely low-risk bundled consumer is a shared/default built-in button from `builtin-addons/core-buttons` or the digital `date-time` button, because both already render ordinary `deck-button` output instead of bespoke variants.
