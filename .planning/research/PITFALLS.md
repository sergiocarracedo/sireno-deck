# Pitfalls Research

**Domain:** v1.3 typography scaling, live text fitting, and rich date-time formatting
**Researched:** 2026-05-28
**Confidence:** HIGH

## Common Mistakes

| # | Mistake | Severity | Why It Matters |
|---|---------|----------|----------------|
| 1 | Keeping typography role classes responsible for the final `font-size` | HIGH | This is the exact reason `size` cannot currently scale relative to theme bases |
| 2 | Using one generic fit mechanism for wrap, ellipsis, marquee, and shrink | HIGH | Only shrink needs measurement; the rest become harder to reason about for no gain |
| 3 | Letting shrink-fit mutate the observed element in a resize loop | HIGH | `ResizeObserver` can thrash or emit loop warnings if feedback is uncontrolled |
| 4 | Turning date-time rich formatting into generic HTML/markdown support | HIGH | Scope explodes into escaping, nesting, and security questions immediately |
| 5 | Mixing Day.js token parsing with custom rich-marker parsing in one ambiguous pass | MEDIUM | Escaping rules get muddy fast, especially around literals and `|` line breaks |
| 6 | Ignoring reduced-motion for blink | MEDIUM | The feature becomes an accessibility regression instead of a useful visual affordance |
| 7 | Formalizing requirements against stale tests instead of live code | MEDIUM | The repo already shows drift: current schema is one `format` field while tests still expect `date_format`/`time_format`/`variant` |
| 8 | Allowing rich tags to override typography family/weight more broadly than needed | MEDIUM | Widget formatting starts fighting theme ownership instead of extending it |

## Warning Signs

| Warning Sign | Indicates | Action |
|-------------|-----------|--------|
| `.font-main` still contains a hard-coded `font-size` after the milestone starts | root bug not actually fixed | split role base size from variant size multiplier |
| `fit="wrap"` or `fit="ellipsis"` starts depending on JS observers | overengineered text pipeline | push those modes back to CSS |
| The formatter starts supporting arbitrary nesting or raw markup passthrough | parser scope leak | reduce grammar to the explicit v1.3 markers |
| Blink implementation adds intervals/timeouts in widget code | presentation leaked into logic | move blink to CSS animation |
| Tests still assert split date/time config while implementation uses single `format` | contract drift remains unresolved | requirements must choose one surface and update both code and tests later |
| Theme wrappers begin inferring size from class names instead of props | duplicated hidden contract | rely on explicit `size` prop metadata |

## Prevention Strategies

| Strategy | Prevents | How |
|----------|----------|-----|
| Layer typography CSS variables explicitly | #1 | emit base size per role, then multiply with size tokens |
| Restrict measured logic to shrink mode | #2 | keep wrap/ellipsis/marquee declarative |
| Guard ResizeObserver updates with expected-size logic or frame deferral | #3 | avoid resize feedback loops documented by MDN |
| Define a tiny rich-format grammar up front | #4, #5 | support only `|`, `*...*`, selected size tags, and `<blink>` |
| Keep Day.js as the token formatter under the rich parser | #5 | one pass formats date tokens, a second pass applies widget-local rich markers |
| Add reduced-motion behavior in the same change as blink | #6 | do not let accessibility become a follow-up |
| Call out stale test/implementation seams in requirements | #7 | avoid planning against dead contracts |
| Let rich spans inherit typography by default | #8 | only override tone, weight, size, or blink when markup asks for it |

---
*Pitfalls research for: v1.3 typography scaling, live text fitting, and rich date-time formatting*
*Researched: 2026-05-28*
