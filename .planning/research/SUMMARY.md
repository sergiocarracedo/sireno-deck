# Research Summary

**Domain:** v1.1 addon UI and live widgets
**Researched:** 2026-05-14
**Confidence:** HIGH

## Executive Summary

The new milestone should be treated as a focused extension of the shipped addon system, not a platform rewrite. The best path is to keep the current addon/runtime/reconciler architecture intact and improve three contracts: authoring ergonomics for custom deck elements, live-refresh scheduling for date/time widgets, and renderer text/theming behavior for small SVG-driven displays. TypeScript already provides the right mechanism for typed custom intrinsic JSX elements, `Intl.DateTimeFormat` is the right date formatting primitive, and SVG text behavior must be made explicit because `<text>` does not wrap by default. [CITED: https://www.typescriptlang.org/docs/handbook/jsx.html] [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat] [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/text]

## Recommended Stack / Direction

- Keep the existing TypeScript + React + react-reconciler + sharp stack.
- Add typed JSX intrinsic support instead of inventing a new authoring DSL.
- Use `Intl.DateTimeFormat` and `formatToParts()` for locale-safe date composition.
- Keep typography in theme YAML / zod-driven config rather than addon-local style configuration.
- Keep the current render surface narrow and evolve it minimally.

## Feature Recommendations

### Must-have for v1.1

- [ ] Fix built-in `date-time` refresh through core-owned scheduler contract
- [ ] Add typed JSX support for `deck-button`, `deck-text`, and `deck-surface`
- [ ] Add theme-driven typography tokens
- [ ] Add explicit shared text behavior modes such as marquee and ellipsis
- [ ] Add `analog-clock` built-in button type
- [ ] Add `calendar-sheet` built-in button type with tear-sheet semantics
- [ ] Clarify addon authoring examples around custom deck elements

### Keep out of this milestone

- [ ] Full design-system expansion beyond needed typography tokens
- [ ] Mandatory wrapper for all buttons
- [ ] Separate rendering engine for clocks/calendars
- [ ] Dense month-grid calendar as the first calendar visual

## Roadmap Implications

Recommended roadmap order for the new milestone:

1. Base contracts: live refresh + typed JSX support
2. Typography and explicit text behavior
3. Shared optional wrapper + analog clock
4. Calendar-sheet + authoring clarity/docs

That yields a clean sequence where each step is demoable and builds on already-stabilized contracts rather than mixing renderer, theme, and widget invention in one phase.

## Primary Recommendation

Do the smallest architectural thing that unlocks the milestone: keep the addon host, runtime scheduler, and reconciler model intact, then layer typed JSX, typography-aware text rendering, and the new date/time visuals on top. The main risk is not technical feasibility; it is scope creep into renderer redesign or design-system overbuild.

---
*Research summary for: v1.1 addon UI and live widgets*
*Researched: 2026-05-14*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
