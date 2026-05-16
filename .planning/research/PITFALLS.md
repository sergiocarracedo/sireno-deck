# Pitfalls Research

**Domain:** v1.1 addon UI and live widgets
**Researched:** 2026-05-14
**Confidence:** HIGH

## Common Mistakes

| # | Mistake | Severity | Why It Matters |
|---|---------|----------|----------------|
| 1 | Adding addon-local timers for clocks | HIGH | Breaks the existing architecture where core owns scheduling and cleanup |
| 2 | Treating JSX support as a new renderer instead of typed sugar over the same intrinsic contract | HIGH | Creates unnecessary API churn for addons and tests |
| 3 | Letting text overflow behavior emerge accidentally from SVG clipping | HIGH | Produces unstable output and brittle tests on tiny displays |
| 4 | Over-designing typography into a full design-system rewrite | MEDIUM | Milestone scope explodes before the date/time widgets ship |
| 5 | Building a month-grid calendar on a 72x72 key first | MEDIUM | Low legibility; wastes effort on a poor first experience |
| 6 | Overusing `textLength` so text looks distorted | MEDIUM | Fit-to-width can compress spacing or glyphs unnaturally [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/textLength] |

## Warning Signs

| Warning Sign | Indicates | Action |
|-------------|-----------|--------|
| A clock button starts its own `setInterval` | Scheduler ownership drift | Move cadence back to button definition + runtime scheduler |
| JSX work needs broad reconciler semantic changes | Over-scoped authoring change | Keep JSX as typing/ergonomics over existing intrinsic names |
| Long labels only “work” because tests compare generic buffer inequality | Undefined overflow behavior | Introduce explicit text behavior modes and assert them directly |
| Theme work starts adding many unrelated visual tokens | Design-system expansion | Limit milestone v1.1 to typography tokens needed by renderer text |
| Calendar mockups look dense or unreadable on one key | Wrong information density | Prefer tear-sheet current-day layout |

## Prevention Strategies

| Strategy | Prevents | How |
|----------|----------|-----|
| Keep scheduler ownership in core | #1 | Use `defaultIntervalMs`, `refresh()`, and config override rather than timers inside addon instances |
| Use TypeScript intrinsic JSX typing directly | #2 | Add `JSX.IntrinsicElements` support for the same `deck-*` names the reconciler already consumes [CITED: https://www.typescriptlang.org/docs/handbook/jsx.html] |
| Make text behavior an explicit contract | #3 | Define modes such as marquee, ellipsis, and fit instead of letting clipping be the API |
| Scope typography to renderer needs | #4 | Add only the token structure needed for current text rendering and wrapper visuals |
| Use `Intl.DateTimeFormat` / `formatToParts()` | #5 | Compose locale-aware date labels without brittle string slicing [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat] |
| Treat `textLength` as a controlled fit tool, not the default | #6 | Reserve it for bounded fit cases where distortion is acceptable and tested [CITED: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/textLength] |

---
*Pitfalls research for: v1.1 addon UI and live widgets*
*Researched: 2026-05-14*
