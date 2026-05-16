# Stack Research

**Domain:** v1.1 addon UI and live widget extension work
**Researched:** 2026-05-14
**Confidence:** HIGH

## Recommended Stack

### Keep The Existing Core Stack

| Technology | Version / Source | Role In This Milestone | Why |
|------------|------------------|------------------------|-----|
| TypeScript | existing repo `~5.7` | JSX typing, theme contracts, addon API surfaces | TypeScript's JSX namespace and intrinsic element typing are the right mechanism for typed custom elements. [CITED: https://www.typescriptlang.org/docs/handbook/jsx.html] |
| React + react-reconciler | existing repo `^19.x` + `^0.33` | custom deck element authoring and render tree shaping | The repo already uses React as a custom renderer boundary; milestone work should extend typings, not swap rendering models. [VERIFIED: codebase scan] |
| sharp + SVG strings | existing repo | rasterize text and custom button visuals | Existing render path already turns SVG into raw key buffers; new visuals should build on it rather than introducing another drawing engine. [VERIFIED: codebase scan] |
| Intl.DateTimeFormat | built into JS runtime | locale-aware digital date/time and calendar text formatting | `Intl.DateTimeFormat` supports locale-sensitive formatting plus `formatToParts()` for custom composition. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat] |
| YAML theme files + zod | existing repo | typography tokens and render behavior config | The theme contract already flows through YAML + zod validation; expanding it is lower-risk than inventing a separate style system. [VERIFIED: codebase scan] |

### Additional Milestone-Level Recommendations

| Recommendation | Use | Why |
|---------------|-----|-----|
| Use JSX intrinsic typings, not a new component DSL | addon authoring ergonomics | TypeScript already supports typing lowercase intrinsic elements through `JSX.IntrinsicElements`. [CITED: https://www.typescriptlang.org/docs/handbook/jsx.html] |
| Use `Intl.DateTimeFormat.formatToParts()` when composing calendar/date labels | calendar-sheet and custom date text | It avoids brittle string splitting across locales. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat] |
| Keep SVG text rendering explicit | marquee/ellipsis/fit behavior | SVG `<text>` does not wrap by default, so overflow behavior must be intentional. [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/text] |
| Use `textLength` / `lengthAdjust` carefully for fit-to-width cases | bounded text fitting on small keys | SVG can constrain rendered width, but overuse will distort glyph spacing or glyph shapes. [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/textLength] |

## Alternatives Considered

| Recommended | Alternative | Why Not Preferred |
|-------------|-------------|-------------------|
| Extend custom intrinsic JSX typings | Replace with ordinary React components only | Components would still have to map back to the same narrow custom render surface; intrinsic typings better match the renderer contract |
| Expand current theme schema | Add addon-local font options only | This would bypass theming consistency and make text rendering drift across buttons |
| Extend current SVG/text renderer | Introduce a separate canvas/date-time drawing subsystem | Splits rendering logic and duplicates sizing/layout concerns on a tiny display |
| Use explicit text behavior modes | Let SVG clipping decide overflow | SVG text does not wrap by default, and accidental clipping is not a stable contract [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/text] |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| A second render engine for clocks/calendars | Increases drift and duplicated tests | Extend `packages/cli/src/render/text-image.ts` and the existing reconciler model |
| Locale formatting via hardcoded string templates only | Breaks non-US/non-default locale expectations | `Intl.DateTimeFormat` and `formatToParts()` |
| Implicit overflow/clipping behavior as the API | Hard to test and explain | Explicit marquee / ellipsis / fit modes |
| Mandatory wrapper for all buttons | Over-constrains custom visuals like analog clocks | Optional shared wrapper primitive |

## Versions

### Relevant Compatibility Notes

| Concern | Recommendation | Notes |
|---------|----------------|-------|
| JSX typing mode | stay compatible with current TS/React setup | The repo currently uses TS strict mode and React without `.tsx` authoring in the render layer; adding JSX support should be additive |
| Date formatting | rely on modern Node 20 Intl support | The runtime target already assumes Node 20 in `packages/cli/tsdown.config.ts` |
| SVG text layout | keep behavior deterministic and bounded | SVG text support is broad, but wrapping is not automatic and fit behaviors must be explicit [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/text] |

---
*Stack research for: v1.1 addon UI and live widgets*
*Researched: 2026-05-14*
