# Stack Research

**Domain:** v1.3 typography scaling, live text fitting, and rich date-time formatting
**Researched:** 2026-05-28
**Confidence:** HIGH

## Recommended Stack

### Keep The Existing Core Stack

| Technology | Version / Source | Role In This Milestone | Why |
|------------|------------------|------------------------|-----|
| TypeScript | existing repo `~5.7` | widen text, theme, and formatter contracts safely | This milestone is contract growth inside an existing CLI/render stack, not a platform rewrite. [HIGH: codebase scan] |
| React + mounted/dom host rendering | existing repo `^19.x` | keep `Text` and built-in widgets authored on the current UI surface | The repo already renders the same authored components through mounted host HTML and browser rendering. New text behavior should stay on that path. [HIGH: `packages/cli/src/ui/Text.tsx`, `packages/cli/src/render/dom-host.tsx`] |
| Theme CSS custom properties | existing repo | typography-base variables per role | The current theme runtime already emits `--sireno-font-main-size`, `--sireno-font-aux-size`, and `--sireno-font-mono-size`. Size variants should scale from those variables instead of replacing them. [HIGH: `packages/cli/src/render/theme-utilities.ts`] |
| `ResizeObserver` | MDN Baseline Widely available since July 2020 | realtime shrink-fit recomputation when text or container size changes | This is the right browser seam for measured fitting. It is widely available and specifically intended for element-size-driven adaptation. [HIGH: MDN ResizeObserver] |
| CSS `font-size-adjust` | MDN Baseline 2024, newly available | improve mixed-font and fallback stability where useful | Helpful for theme typography stability, but should be additive, not a milestone dependency. [HIGH: MDN font-size-adjust] |
| Day.js core `format()` | existing repo | base date-time token formatting | Already used today, and it supports escaped literals plus the existing formatting surface. [HIGH: `packages/cli/src/builtin-addons/date-time/format.ts`, Day.js format docs] |
| Day.js `AdvancedFormat` plugin | official plugin | optional richer date tokens if requirements want ordinals/week tokens | This extends formatting without inventing homegrown date tokens. Only add it if requirements explicitly need those tokens. [HIGH: Day.js AdvancedFormat docs] |
| CSS animation + `prefers-reduced-motion` | MDN Baseline Widely available since Jan 2020 | blink segments with accessibility guardrails | A blinking span is a presentation concern, not a timer-owned JS concern, unless runtime synchronization becomes required later. [HIGH: MDN prefers-reduced-motion] |

### Milestone-Level Recommendations

| Recommendation | Use | Why |
|---------------|-----|-----|
| Keep typography role classes for family/weight/tracking only, move effective font size to layered CSS variables | theme-relative text sizes | Today `.font-main` hard-codes the final font size, which defeats `text-sm/lg/xl`. The size classes should multiply from the active typography base instead. [HIGH: `packages/cli/src/ui/Text.tsx`, `packages/cli/src/render/theme-utilities.ts`] |
| Treat `md` as the per-typography base and scale other sizes proportionally | `xs/sm/md/lg/xl/2xl` text variants | This matches the user request and preserves developer control without baking per-theme absolute sizes into component code. [HIGH: user scope + codebase scan] |
| Reserve DOM measurement for `fit="shrink"` only | live largest-non-wrapping fit | `wrap`, `ellipsis`, and `marquee` already map cleanly to declarative CSS behavior. Only shrink needs measurement/search. [HIGH: `packages/cli/src/ui/Text.tsx`] |
| Add a dedicated rich-format parser for the built-in date-time widget only | `|`, `*...*`, `<xs>...</xs>`, `<blink>...</blink>` | The user explicitly scoped this syntax to the date-time widget, not generic `Text`. Keep the parser local to avoid turning milestone scope into a general rich-text engine. [HIGH: user-confirmed scope] |
| Keep theme UI presentation hooks compatible with new text metadata | theme-owned text wrappers | The `ThemeTextPresentationProps` seam already receives `fit`, `tone`, `typography`, and `size`. It should remain the outer wrapper contract. [HIGH: `packages/cli/src/config/theme.ts`, `packages/cli/src/themes/default/ButtonFrame.tsx`] |

## Alternatives Considered

| Recommended | Alternative | Why Not Preferred |
|-------------|-------------|-------------------|
| CSS variable multiplier model for text sizing | hard-coded lookup table of absolute pixel sizes per typography role | Duplicates theme data and breaks the requirement that sizes remain dynamic relative to theme bases |
| Measured shrink-fit only for `fit="shrink"` | ResizeObserver-based logic for every text mode | Expands runtime complexity where CSS already solves the problem |
| Date-time-local rich formatting parser | generic inline markup parser inside `Text` | Scope creep and a future escaping/sanitization burden without user demand |
| CSS animation for blink | JS interval toggling class/state every second | Harder to test, easier to leak timers, and unnecessary for a pure presentation toggle |
| Use Day.js plugins for extra date tokens when needed | invent new date token semantics inside the custom formatter | Confuses two different formatting layers and guarantees documentation pain |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Keeping font size inside `.font-main/.font-aux/.font-mono` as the final applied size | blocks proportional scaling from component `size` props | split base-size variables from size-multiplier variables |
| Global rich-text parsing inside core `Text` | turns one widget feature into a system-wide syntax commitment | parser local to the date-time addon |
| JS-driven blink as the default implementation | introduces timers and motion-control complexity | CSS keyframes plus reduced-motion handling |
| CSS-only clamp for shrink-fit | cannot guarantee largest non-wrapping size on changing content | measured fitting only where shrink semantics require it |
| Container-query-only fluid type as the main sizing mechanism | responds to container size, not actual text overflow/non-wrap constraints | typography base multipliers plus measured shrink fallback |

## Versions

### Relevant Compatibility Notes

| Concern | Recommendation | Notes |
|---------|----------------|-------|
| `ResizeObserver` | safe to depend on in the browser-render path | Widely available since 2020; still avoid resize-observer loops by not mutating the observed box in feedback cycles. [HIGH: MDN ResizeObserver] |
| `font-size-adjust` | optional enhancement only | Baseline 2024. Good for font fallback stability, but not required to satisfy the milestone contract. [HIGH: MDN font-size-adjust] |
| `prefers-reduced-motion` | must gate blink intensity/behavior | Widely available and directly relevant to blinking text. [HIGH: MDN prefers-reduced-motion] |
| Day.js AdvancedFormat | add only if requirements need extra tokens beyond core format | Keep the formatter surface small unless there is explicit user value in more tokens. [HIGH: Day.js AdvancedFormat docs] |

---
*Stack research for: v1.3 typography scaling, live text fitting, and rich date-time formatting*
*Researched: 2026-05-28*
