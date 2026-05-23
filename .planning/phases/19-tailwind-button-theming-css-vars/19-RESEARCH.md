# Phase 19 Research

**Phase:** 19 - Tailwind Button Theming via Theme CSS Variables
**Date:** 2026-05-23

## Don't Hand-Roll

- Do not invent a second theme token source separate from `packages/cli/src/config/theme.ts`. The current theme loader already resolves the authoritative Sireno token set (`background`, `foreground`, `primary`, `accent`, `success`, `danger`, and typography roles), so Phase 19 should export CSS variables from those resolved values instead of maintaining parallel theme definitions. [VERIFIED: packages/cli/src/config/theme.ts]
- Do not adopt Tailwind as a full new runtime/build subsystem just to get `text-primary`. Tailwind's official model is CSS-build-driven: it defines theme variables with `@theme`, detects classes in source files, and generates CSS ahead of time from statically detectable class names. This repo currently has no Tailwind dependency, no CSS build entry, and the browser renderer builds HTML strings at runtime, so a wholesale Tailwind rollout would be a larger architecture change than the Phase 19 scope promises. [CITED: https://tailwindcss.com/docs/theme] [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files] [VERIFIED: packages/cli/package.json] [VERIFIED: packages/cli/src/render/dom-host.tsx]
- Do not create a new precedence system in CSS. Earlier phases already locked `button -> deck -> theme` precedence and explicit overrides staying authoritative, so the CSS-variable layer should publish resolved values, not override them. [VERIFIED: .planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md] [VERIFIED: .planning/REQUIREMENTS.md]
- Do not treat typography token wiring as “done” based only on synthetic token assertions. Prior art in this repo already showed that typography differences can vanish on the real render path if verification is not tied to the shipped surface. Phase 19 needs browser-path verification for typography-backed classes. [VERIFIED: .planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md]

## Common Pitfalls

- Tailwind class detection is static text scanning. Dynamically constructed class names are not detected by Tailwind unless safelisted, and the repo's runtime-generated HTML path would be especially easy to get wrong if it tried to depend on build-time scanning alone. [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files] Confidence: HIGH
- Tailwind `@theme` is not just `:root`; it is specifically how Tailwind decides which utility classes exist. If Sireno only needs a narrow stable utility surface backed by runtime theme values, shipping a small curated utility stylesheet may be safer than forcing the renderer into Tailwind's full compile-time theme pipeline. [CITED: https://tailwindcss.com/docs/theme] Confidence: HIGH
- CSS custom properties inherit by default, and values are resolved where they are used. That is useful for a deck-root theme surface, but it means plans should be explicit about scoping variables on the browser deck root and about fallbacks for surfaces that opt out or override values. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties] Confidence: HIGH
- `@property` can add typing and initial values for custom properties, but using it broadly is optional overhead here. Sireno's first need is a stable exported variable contract, not a Houdini-heavy typed-properties system. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties] Confidence: MEDIUM
- Hardcoded inline styles in the current DOM helpers and `ButtonFrame` will bypass any class-based utility strategy until they are rewritten or reduced. That means Phase 19 must include migration of the core shared browser surface, not just additive utility docs. [VERIFIED: packages/cli/src/render/button-frame.tsx] [VERIFIED: packages/cli/src/addon/api.ts] Confidence: HIGH

## Existing Patterns in This Codebase

- `packages/cli/src/config/theme.ts` already resolves the exact token set Phase 19 wants to expose. This should remain the single source of truth for all exported CSS vars. [VERIFIED: packages/cli/src/config/theme.ts]
- `packages/cli/src/render/dom-host.tsx` owns the browser deck HTML shell and currently emits inline HTML with deck background applied at the `<body>` and `#deck-root` level. It is the natural injection point for global CSS vars and a narrow browser-surface utility stylesheet. [VERIFIED: packages/cli/src/render/dom-host.tsx]
- `packages/cli/src/render/button-frame.tsx` hardcodes gradients, border, padding, and internal fill using inline styles. Any shared theming story has to touch this file because it is the visible default chrome for non-`full_surface` buttons. [VERIFIED: packages/cli/src/render/button-frame.tsx]
- `packages/cli/src/addon/api.ts` helper output still hardcodes text color, family, size, and weight. If Phase 19 promises theme-backed utilities or typography roles, these helpers either need to consume the new classes/vars or become clearly secondary to class-based authoring. [VERIFIED: packages/cli/src/addon/api.ts]
- The package currently exports only DOM helper functions and `ButtonSurface`; there is no Tailwind stylesheet, no generated CSS artifact, and no class utility module today. [VERIFIED: packages/cli/src/index.ts] [VERIFIED: packages/cli/package.json]

## Recommended Approach

### Recommendation

Use a Sireno-owned CSS-variable and utility-layer implementation on the browser deck surface, not a full Tailwind toolchain adoption in this phase. [CITED: https://tailwindcss.com/docs/theme] [CITED: https://tailwindcss.com/docs/adding-custom-styles] [VERIFIED: packages/cli/package.json] Confidence: HIGH

### Why

- It matches the user decision: className-first authoring with a core-owned mapping for theme-token utilities like `text-primary`. [VERIFIED: .planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md]
- It respects the current architecture: runtime-generated browser HTML, one deck shell, no CSS build pipeline. [VERIFIED: packages/cli/src/render/dom-host.tsx] [VERIFIED: packages/cli/package.json]
- It keeps scope narrow: theme-token utilities only, no broad spacing/shadow/layout Tailwind clone. [VERIFIED: .planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md]

### Concrete planning guidance

1. Add one browser-surface stylesheet source in core, likely generated as a CSS string or static module imported by `dom-host.tsx`. It should define:
   - Sireno-namespaced CSS vars on the deck root from resolved theme values
   - a narrow set of Sireno-owned utility classes for theme-token colors and typography roles
   - only the utilities the phase explicitly promises, such as `text-primary`, `text-foreground`, `bg-background`, `border-accent`, `fill-primary`, `stroke-accent`, and likely typography-role classes
   [VERIFIED: .planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md] [CITED: https://tailwindcss.com/docs/adding-custom-styles] Confidence: HIGH
2. Rework `ButtonFrame` to consume the new variable-backed styling contract instead of fixed inline colors. This is the shared visible proof that the theme bridge affects shipped UI, not just addon-authored examples. [VERIFIED: packages/cli/src/render/button-frame.tsx] Confidence: HIGH
3. Update core DOM helpers in `packages/cli/src/addon/api.ts` to align with the className-first contract. The safest shape is likely:
   - helpers emit stable class names for default Sireno typography/content behavior
   - addon authors may still pass ordinary `className` and use plain DOM elements directly
   - no return to a special render DSL
   [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: .planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md] Confidence: HIGH
4. Keep explicit override precedence in runtime/config code authoritative. The CSS-var export should publish already-resolved values from runtime/theme state rather than moving precedence into CSS heuristics. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md] Confidence: HIGH
5. Add tests and a review fixture that prove theme-backed classes affect the real browser-rendered path. Include at least one typography-visible check that survives host/font variability, per the prior typography bug lesson. [VERIFIED: .planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md] Confidence: HIGH

### Tailwind-specific conclusion

- Tailwind's official docs are useful here as design guidance for theme variables, custom utilities, and source-detection limitations. [CITED: https://tailwindcss.com/docs/theme] [CITED: https://tailwindcss.com/docs/adding-custom-styles] [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files]
- But based on the current repo shape, the best Phase 19 plan is to implement a Sireno-native, Tailwind-inspired utility contract first. A real Tailwind compiler integration could be a later phase if the product eventually needs broader utility generation or external stylesheet authoring. [ASSUMED] Confidence: MEDIUM
