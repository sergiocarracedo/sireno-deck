# Architecture Research

**Domain:** v1.3 typography scaling, live text fitting, and rich date-time formatting
**Researched:** 2026-05-28
**Confidence:** HIGH

## Component Boundaries

### Main Architecture Constraint

This milestone still fits the existing architecture if each concern lands in one seam:

- theme runtime owns typography base variables per role
- `Text` owns declarative text intent: `fit`, `size`, `typography`, alignment, tone
- theme UI presentation owns wrapper-level styling and metadata passthrough
- browser-render path owns measured shrink-fit behavior
- built-in date-time addon owns parsing of date-time-only rich formatting syntax
- Day.js remains the date token formatter under that parser, not a replacement target

The repo's current issue is simple: `.font-main/.font-aux/.font-mono` already set the final `font-size`, so `text-sm/lg/xl` cannot be truly relative. [HIGH: `packages/cli/src/render/theme-utilities.ts`, `packages/cli/src/ui/Text.tsx`]

### Components Most Directly Touched

| Component | Current Role | Milestone Pressure |
|-----------|--------------|--------------------|
| `packages/cli/src/ui/Text.tsx` | public text component surface | keep public props stable while changing how size and shrink-fit are realized |
| `packages/cli/src/render/theme-utilities.ts` | emits shared theme CSS classes and variables | split typography-role base values from size multipliers and add blink/reduced-motion helpers if global |
| `packages/cli/src/config/theme.ts` | typed theme contract and theme UI presentation props | may need stronger typing/docs around size semantics, but existing props already carry the needed metadata |
| `packages/cli/src/themes/default/ButtonFrame.tsx` | default theme presentation wrappers | should keep forwarding `size`, `fit`, and typography metadata without assuming absolute font sizing |
| `packages/cli/src/builtin-addons/date-time/format.ts` | current plain Day.js string formatting | natural home for rich format parsing or an adjacent parser helper |
| `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx` | current one-line rendered widget | needs to render segmented rich content instead of a single flat string |
| `packages/cli/src/builtin-addons/date-time/schemas.ts` | widget config schema | requirements must choose whether v1.3 standardizes one rich `format` string or reintroduces split date/time config fields |

## Data Flow

### Recommended Flow For This Milestone

1. Load theme typography roles as base variables for family, weight, tracking, and base size.
2. `Text` resolves `typography` and `size` to a role-specific base plus a size multiplier.
3. For `fit="wrap"`, `ellipsis`, and `marquee`, render declaratively with CSS classes only.
4. For `fit="shrink"`, mount a measured text container in the browser-render path and recompute when text or container size changes.
5. For the built-in date-time widget, first format the raw date tokens with Day.js.
6. Parse the resulting format string plus rich markers into a small segment tree.
7. Render that segment tree as nested spans or stacked lines using `Text`-compatible styling primitives.
8. Apply blink presentation through CSS, with reduced-motion overrides.

### Key Architectural Recommendation

Do not collapse three different concerns into one mechanism:

- typography scaling is a theme/CSS concern
- shrink-fit is a measured layout concern
- rich date-time formatting is a parsing/render-tree concern

Trying to solve all three with one generic text engine will overcomplicate the milestone and blur ownership.

## Build Order

1. Redefine typography CSS so role classes expose a scalable base instead of the final size.
2. Update `Text` size semantics and add tests that prove `sm/md/lg/...` are proportional to active typography bases.
3. Add browser-path shrink-fit measurement with a minimum font floor and realtime invalidation.
4. Decide and document the v1.3 date-time config contract: one rich `format` string vs split fields.
5. Add a date-time-local rich format parser that outputs segments/lines.
6. Render rich segments with accent, bold, size overrides, and blink behavior.
7. Add accessibility and stale-contract regression tests.

## Integration Points

| Boundary | Current Contract | Milestone Guidance |
|----------|------------------|--------------------|
| Theme -> shared CSS | typography role classes currently include final font size | move to base-size variable plus size multiplier composition |
| `Text` -> theme UI presentation | passes `fit`, `tone`, `typography`, `size` into theme wrappers | keep this contract stable; do not hide sizing semantics inside themes alone |
| Browser render -> text layout | mostly declarative DOM/CSS output today | add measured logic only for shrink mode |
| Date-time config -> formatter | currently live code is `format`, while tests still reference older split fields | requirements must pick one contract explicitly to avoid drifting implementation/tests |
| Rich formatter -> rendered spans | not present yet | output a narrow segment model, not arbitrary HTML |

---
*Architecture research for: v1.3 typography scaling, live text fitting, and rich date-time formatting*
*Researched: 2026-05-28*
