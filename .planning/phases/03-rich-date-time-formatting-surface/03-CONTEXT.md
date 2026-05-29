# Phase 3: Rich Date-Time Formatting Surface - Context

**Gathered:** 2026-05-29
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Phase 3 is now being treated as a shared `Text` rich-markup contract that the built-in date-time button consumes after Day.js token expansion, rather than as a date-time-only formatter. The phase delivers a strict whitelist mini markup language with proper nesting, shared tone/size semantics, structural line breaks, and blink support, while explicitly avoiding arbitrary HTML/Markdown or theme-owned parsing semantics.

## Implementation Decisions

### Grammar Shape
- `date-time` expands Day.js tokens first, then passes the resulting string into shared `Text` rich-markup parsing.
- Shared `Text` always parses string children for markup rather than requiring an opt-in prop.
- The markup language is a strict whitelist mini markup language with proper nesting; no loose tag soup or arbitrary extensibility.
- Allowed color tags map only to the existing shared text tone tokens: `foreground`, `primary`, `accent`, `success`, and `danger`.
- Inline size tags should use the existing shared `Text` size vocabulary only (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`).
- `*...*` remains a supported shorthand for accent + bold highlighting.

### Render Model
- Core `Text` owns rich-markup parse + render semantics.
- The parser should produce a small internal AST before rendering nested output.
- `|` is a structural line-break token, not a CSS-afterthought or a date-time-only special case.
- Theme wrappers continue to observe only the same top-level `Text` metadata (`align`, `fit`, `size`, `tone`, `typography`) and do not receive or influence inner markup semantics.

### Blink Behavior
- `<blink>...</blink>` is implemented as CSS animation only.
- Blink can compose with other whitelisted tags through the parsed AST.
- Phase 3 does not add blink speed, duty-cycle, or per-tag timing controls.
- Current user intent is to keep blink active even under reduced-motion preference.

### Error Handling
- Any invalid markup falls back to the original literal source text.
- Invalid markup includes malformed structure, unknown tags, and unsupported tag combinations.
- The parser rejects both structural errors and unsupported combinations rather than trying best-effort recovery.

### Agent's Discretion
- Exact parser/helper placement inside the shared `Text` implementation.
- Exact internal AST node shapes and render helper structure.
- Exact whitelist list expression for size/tone/blink/line-break nodes as long as it matches the locked semantics above.
- Exact DOM structure for rendered lines and nested spans.
- Exact test and fixture shape needed to prove nested markup, literal fallback, and shared `Text` adoption honestly.

## Specific Ideas

- Shared `Text` becomes the single markup-aware surface.
- `date-time` should only own Day.js token expansion, then pass markup through untouched.
- Rich markup needs nesting support, including tone tags like `<accent>...</accent>` and `<danger>...</danger>`.
- Tone tags should reuse the existing shared text tones instead of inventing a second color language.
- Size tags should reuse the existing shared `Text` sizes.
- `|` should render deliberate stacked lines.
- Blink stays narrow and declarative.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `.planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md`
- `packages/cli/src/ui/Text.tsx`
- `packages/cli/src/ui/index.ts`
- `packages/cli/src/themes/default/ButtonFrame.tsx`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/builtin-addons/date-time/format.ts`
- `packages/cli/src/builtin-addons/date-time/schemas.ts`
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
- `packages/cli/src/builtin-addons/date-time/index.test.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/ui/Text.tsx`: canonical shared text surface that already owns `fit`, `size`, `tone`, and `typography` semantics.
- `packages/cli/src/themes/default/ButtonFrame.tsx`: default theme wrapper already observes outer text metadata without owning semantics.
- `packages/cli/src/config/theme.ts`: theme UI presentation types already mirror the shared text metadata contract.
- `packages/cli/src/builtin-addons/date-time/format.ts`: current Day.js formatting seam to keep narrow.

### Established Patterns
- Shared `Text` is canonical; themes are presentation observers, not semantic owners.
- Day.js is already the date/time token engine and should remain that layer.
- Prior phases have preferred explicit narrow contracts over hidden generic behavior.
- Existing tone and size vocabularies already exist in shared `Text`; Phase 3 should reuse them rather than inventing parallel semantics.

### Integration Points
- Rich-markup parsing must integrate at the shared `Text` layer without breaking the existing outer text metadata seam.
- `date-time` should pass its formatted output into shared `Text` rather than building its own rich render tree.
- Theme wrappers must continue to decorate the resulting outer `Text` element only.
- Regression coverage will need to prove nested markup rendering and literal fallback behavior through the shared text surface and date-time consumption path.

## Deferred Ideas

- Arbitrary HTML or Markdown support.
- Arbitrary color names beyond the existing shared tone tokens.
- Per-tag blink timing controls or other animation parameters.
- Theme-owned parsing or inner rich-markup hooks.
- A separate `RichText` component instead of shared `Text` ownership.

---
*Phase: 03-rich-date-time-formatting-surface*
*Context gathered: 2026-05-29*
