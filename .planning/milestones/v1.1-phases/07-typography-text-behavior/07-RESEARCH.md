# Phase 7: Typography + Text Behavior - Research

**Researched:** 2026-05-14
**Phase goal:** Replace ad hoc text styling with theme-driven typography tokens and explicit overflow behavior that the renderer can test and share.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| SVG text clipping for shared button layouts | Use SVG-native clipping at the text slot boundary via `overflow="hidden"` on a bounded SVG region or an explicit `clipPath`, and model clipping as a renderer contract instead of relying on incidental crop from the outer image canvas | MDN documents that SVG `overflow="hidden"` applies a clip to the exact SVG viewport, which matches the need for deterministic text slot clipping. Keeping clipping explicit in renderer data is more testable than counting on the final 72x72 raster crop. | [CITED: developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/overflow] |
| Theme typography configuration | Extend the existing YAML theme schema with a narrow nested `typography` object instead of inventing a separate style system or broad token matrix | The current theme loader already validates YAML through a strict Zod schema and surfaces file/line errors cleanly. Adding one nested object keeps the contract aligned with existing config behavior and avoids a design-system rewrite. | [VERIFIED: packages/cli/src/config/theme.ts, packages/cli/src/config/theme.test.ts] |
| Shared text styling in SVG output | Centralize typography attributes in small helpers or slot descriptors inside `text-image.ts` rather than repeating `font-family`, `font-size`, `font-weight`, and `letter-spacing` inline in every SVG builder | The renderer currently repeats inline typography values across default, fan, media, and emoji builders. A shared slot helper is the smallest change that can feed both the optional wrapper and future visuals without widening the renderer model. | [VERIFIED: packages/cli/src/render/text-image.ts] |
| Optional wrapper contract for addons | Reuse the existing custom render elements by extending `DeckButtonProps` / `DeckTextProps` in `packages/cli/src/render/types.ts` rather than introducing component abstractions or DOM-like props | Phase 6 deliberately kept the render contract narrow and custom. `render/types.ts` is already the extracted typing seam used by the reconciler and JSX entrypoint, so Phase 7 can expand the contract there without changing the reconciler model. | [VERIFIED: packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, .planning/phases/06-base-contracts/06-CONTEXT.md] |
| Font handling in SVG text | Keep typography tokens expressed as regular SVG/CSS font properties with sensible fallback stacks; do not assume embedded web-font loading will work in the Sharp pipeline | MDN recommends styling SVG text with CSS-like font properties, but the current renderer path rasterizes SVG via Sharp. That makes system/fallback fonts the safer near-term contract than introducing runtime font fetching or embedding work in this phase. | [CITED: developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Using_fonts] [VERIFIED: packages/cli/src/render/text-image.ts] |

## Common Pitfalls

### Hardcoding typography in each SVG variant
**What goes wrong:** The same font family, size, weight, and spacing values get copied into every builder, so changing typography becomes a hunt across multiple templates.
**Why:** `text-image.ts` currently carries repeated inline typography attributes across the default, fan, media, and emoji layouts rather than routing through one shared token layer.
**How to avoid:** Introduce a narrow typography helper or slot map keyed by the approved semantic roles (`main_text`, `auxiliary_text`, `monospace`) and make SVG builders consume that helper instead of inline values. [VERIFIED: packages/cli/src/render/text-image.ts]

### Treating clip-only scope as "no overflow contract"
**What goes wrong:** Planning drops overflow entirely because marquee and ellipsis were deferred, so clipping remains accidental and untestable.
**Why:** The outer 72x72 raster naturally hides some overflow already, which can create a false sense that the behavior is defined.
**How to avoid:** Preserve overflow as an explicit contract even in the narrowed scope by naming clip behavior in render props and testing for bounded text-slot rendering directly. [CITED: developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/overflow] [VERIFIED: packages/cli/src/render/text-image.ts]

### Over-expanding the wrapper into a mandatory shell
**What goes wrong:** The shared wrapper becomes the only rendering path, which will fight later analog-clock and calendar visuals.
**Why:** Shared visual primitives often drift into "everything must use this" once they exist unless the escape hatch is explicit in the contract.
**How to avoid:** Keep the wrapper as an optional `deck-button` contract improvement and preserve direct render paths for bespoke visuals. Reflect that choice in plan objectives and file lists so later phases do not have to unwind it. [VERIFIED: .planning/phases/07-typography-text-behavior/07-CONTEXT.md, packages/cli/src/render/types.ts]

### Expanding theme scope beyond the current milestone
**What goes wrong:** Typography work turns into a broad token-system rewrite with many unused roles and fields.
**Why:** Theme systems invite overdesign when there is no hard boundary.
**How to avoid:** Limit Phase 7 to the three approved semantic roles and only the fields needed by the current SVG text output. Anything beyond that should be deferred until a later phase proves the need. [VERIFIED: .planning/phases/07-typography-text-behavior/07-CONTEXT.md]

### Assuming font behavior is stable across all Sharp environments
**What goes wrong:** A theme specifies a font that renders differently or falls back unexpectedly depending on installed fonts.
**Why:** The renderer feeds raw SVG into Sharp, and the current implementation references system-style font-family strings such as `IBM Plex Sans, Arial, sans-serif` rather than bundling font assets.
**How to avoid:** Keep Phase 7 tokens conservative: font-family plus fallback stack, size, weight, and spacing. Do not make the phase depend on custom font asset loading or remote fonts. [VERIFIED: packages/cli/src/render/text-image.ts] [CITED: developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Using_fonts]

## Existing Patterns in This Codebase

- **Strict config boundary with user-facing errors:** `packages/cli/src/config/theme.ts` validates YAML with a strict Zod schema and raises `ConfigValidationError` with file/line metadata. Typography should extend this path rather than bypass it. [VERIFIED: packages/cli/src/config/theme.ts]
- **Renderer contract seam already extracted:** `packages/cli/src/render/types.ts` holds the shared prop interfaces for `deck-button`, `deck-text`, and `deck-surface`, and `reconciler.ts` maps those into render nodes. This is the clean seam for adding wrapper/text behavior props. [VERIFIED: packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts]
- **Theme is already injected into addon button instances:** `CreateAddonButtonInstanceOptions` includes `theme: Theme`, so built-in and external addons can consume the same typography contract without extra plumbing. [VERIFIED: packages/cli/src/addon/api.ts]
- **Image renderer tests are visual-difference based today:** `packages/cli/src/render/text-image.test.ts` compares output buffers and regions rather than parsing SVG markup. Phase 7 tests should follow that style where possible, adding assertions that make clip behavior and theme-driven output observable. [VERIFIED: packages/cli/src/render/text-image.test.ts]
- **Built-in themes are intentionally small YAML files:** `themes/dark.yml` and `themes/light.yml` are flat and minimal today. Adding a compact nested `typography` block fits the current ergonomics better than a large theme schema explosion. [VERIFIED: themes/dark.yml, themes/light.yml]

## Recommended Approach

Implement Phase 7 as a narrow single-layer-justified renderer/config pass: first extend theme loading with a compact nested `typography` object for `main_text`, `auxiliary_text`, and `monospace`, then thread those tokens into a shared text-slot helper in `text-image.ts` and the optional wrapper/render prop contract in `render/types.ts` and `reconciler.ts`. [VERIFIED: packages/cli/src/config/theme.ts, packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, packages/cli/src/render/text-image.ts]

Keep overflow explicit even though scope is narrowed to `clip` only: define clipping as a deliberate shared text behavior for the wrapper/text slots and cover it with renderer tests, but defer ellipsis, marquee, and any scheduler implications to later phases. [CITED: developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/overflow] [VERIFIED: .planning/phases/07-typography-text-behavior/07-CONTEXT.md]

Do not broaden this into a font-loading project or a mandatory wrapper migration. The correct move is a small contract expansion that replaces hardcoded typography and accidental overflow while preserving direct custom rendering for future analog and calendar visuals. [VERIFIED: .planning/phases/07-typography-text-behavior/07-CONTEXT.md, packages/cli/src/render/text-image.ts]
