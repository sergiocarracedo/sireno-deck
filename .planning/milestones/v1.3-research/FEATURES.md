# Feature Research

**Domain:** v1.3 typography scaling, live text fitting, and rich date-time formatting
**Researched:** 2026-05-28
**Confidence:** HIGH

## Table Stakes

| Feature | Why Expected In This Milestone | Complexity | Notes |
|---------|-------------------------------|------------|-------|
| Theme-relative typography scaling | This is the core user request: `size` must not be pinned to the theme's exact font size | MEDIUM | `md` should mean the typography base for the selected role; other sizes scale proportionally |
| Live shrink-fit recomputation on text changes | The user explicitly wants the max non-wrapping size found in realtime before falling back to min-and-wrap behavior | HIGH | This is the only feature that likely needs measured DOM feedback |
| Clear minimum-size floor for shrink-fit | Unlimited shrinking produces unreadable keys | MEDIUM | Requirements should define whether fallback after min is wrap-only or wrap/clip depending on fit mode |
| Rich built-in date-time formatting | The user explicitly asked for richer layout and inline emphasis | MEDIUM | Scope stays date-time-only this milestone |
| Explicit newline token using `|` | Needed for multi-line date/time layouts in one format string | LOW | Must coexist cleanly with Day.js literals and escaping rules |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Accent-bold highlight syntax `*XXX*` | Lets time/date widgets call out one segment without addon code forks | LOW | Use accent color plus bold, matching user request |
| Inline size override tags like `<xs>...</xs>` | Makes compact secondary lines possible without splitting into multiple widgets | MEDIUM | Requirements should decide the supported size tag set beyond `xs` |
| Blink segments with accessibility guardrails | Makes time separators or alerts expressive without hardcoded widget variants | MEDIUM | Must respect reduced-motion preference |
| One rich format string instead of many widget-specific knobs | Keeps config authoring compact | MEDIUM | Stronger if the same parser can output a simple segment tree into `Text`/span nodes |
| Theme-aware rich formatting | Rich spans should still inherit typography family and base sizing from the active role | MEDIUM | Formatting should override as little as possible |

## Anti-Features

| Feature | Why It Sounds Tempting | Why It’s Problematic | Better Alternative |
|---------|------------------------|----------------------|--------------------|
| General markdown/HTML support in `Text` | Feels flexible | Creates parsing, escaping, and rendering obligations well beyond this milestone | narrow widget-local formatting grammar |
| Rich formatting for every widget immediately | Reuse sounds efficient | Locks in a global syntax before it has been validated on one widget | ship it on date-time first |
| Unlimited nested formatting grammar | Feels expressive | Parser complexity grows fast and edge cases explode | support a shallow, explicit tag set |
| Replacing Day.js tokens with custom date placeholders | Could unify syntax visually | Reinvents well-documented date formatting and confuses users | keep Day.js tokens, add a separate rich wrapper grammar |
| Pure CSS shrink-fit with no measurement | Looks simpler | Cannot satisfy "largest size that does not wrap" reliably on content changes | measured shrink seam only |

---
*Feature research for: v1.3 typography scaling, live text fitting, and rich date-time formatting*
*Researched: 2026-05-28*
