# Feature Research

**Domain:** v1.1 addon UI and live widgets
**Researched:** 2026-05-14
**Confidence:** HIGH

## Table Stakes

Features the new milestone should deliver to feel like a coherent follow-on release rather than scattered polish.

| Feature | Why Expected In This Milestone | Complexity | Notes |
|---------|-------------------------------|------------|-------|
| Live built-in date/time button refresh | The current built-in `date-time` button reads as broken if it renders once and never updates | LOW | Existing scheduler model already exists in runtime; this is mostly contract wiring |
| Typed JSX addon authoring for custom deck elements | Addon authors should not have to stay on raw `createElement(...)` for a custom React renderer | MEDIUM | TypeScript supports intrinsic JSX typing directly [CITED: https://www.typescriptlang.org/docs/handbook/jsx.html] |
| Theme-driven typography | Current renderer hardcodes font-family strings instead of reading from theme | MEDIUM | Existing theme pipeline already exists; schema expansion is needed |
| Explicit text behavior contract | Long labels need predictable behavior on small keys | MEDIUM | SVG text does not wrap by default [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/text] |

## Differentiators

Features that make this milestone more than a bugfix pack.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `analog-clock` built-in button | Proves the addon/render model supports bespoke visuals, not just text cards | MEDIUM | Should reuse core scheduling and the existing render pipeline |
| `calendar-sheet` built-in button | Gives a high-legibility date visual optimized for one key | MEDIUM | A today-focused tear sheet is more readable than a tiny month grid on 72x72 hardware |
| Optional shared wrapper primitive | Gives built-ins and addons a consistent shell without forcing all visuals into one card layout | MEDIUM | Must remain optional so analog/custom visuals can bypass it |
| Shared marquee / ellipsis helpers | Makes text layout a declared behavior rather than a rendering accident | MEDIUM | Can become a reusable contract for future built-ins and addons |

## Anti-Features

Features that would bloat or derail this milestone.

| Feature | Why It Sounds Tempting | Why It’s Problematic | Better Alternative |
|---------|------------------------|----------------------|--------------------|
| Full design-system overhaul | Typography work can expand fast | Too broad for a focused milestone on addon UI and live widgets | Add only the typography tokens needed by render text now |
| Mandatory wrapper for every button | Uniform visuals are appealing | Breaks the flexibility needed for clocks and future custom visuals | Optional shared wrapper primitive |
| Month-grid calendar in first cut | Feels like “more calendar” | Tiny grids are low-legibility on Stream Deck hardware | Today-focused tear-sheet calendar |
| Addon-local timers | Quick way to make clocks move | Contradicts current architecture where core owns scheduling | Keep `defaultIntervalMs` + config override in core-owned scheduler path |
| New rendering engine for clocks | Easy to justify as “special visuals” | Doubles renderer complexity and splits the API surface | Extend current reconciler/text-image path minimally |

---
*Feature research for: v1.1 addon UI and live widgets*
*Researched: 2026-05-14*
