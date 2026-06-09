# Research Summary

**Domain:** v1.3 typography scaling, live text fitting, and rich date-time formatting
**Researched:** 2026-05-28
**Confidence:** HIGH

## Executive Summary

This milestone should not be planned as one "text improvement" blob. It is three adjacent seams with different ownership:

- typography scaling: theme/base-size contract problem
- shrink-fit: browser measurement problem
- rich date-time formatting: widget-local parser/render problem

The clean path is to fix each seam once, in the right place. The current root bug is that typography role classes already set the final font size, so component `size` variants cannot scale relative to theme bases. The current date-time widget is also simpler than some tests assume: live code uses a single `format` string, while tests still expect older `date_format` / `time_format` / `variant` fields. That drift must be resolved in requirements before execution.

## Recommended Stack / Direction

- Keep the current TypeScript + React + mounted/dom host rendering stack.
- Rework typography CSS so each role exposes a base size and size variants scale from it.
- Use measured layout only for `fit="shrink"`, likely via `ResizeObserver` in the browser render path.
- Keep `wrap`, `ellipsis`, and `marquee` declarative.
- Keep Day.js as the date token engine.
- Add a date-time-only rich format parser for `|`, `*...*`, size tags, and `<blink>...</blink>`.
- Implement blink as CSS animation with `prefers-reduced-motion` handling.

## Feature Recommendations

### Must-have for v1.3

- [ ] Theme-relative `Text` sizing where `md` equals the selected typography base and other sizes are proportional
- [ ] Realtime shrink-fit that finds the largest non-wrapping size before falling back to a minimum floor
- [ ] Explicit minimum shrink floor and fallback behavior after the floor is reached
- [ ] Rich date-time formatting with `|` line breaks
- [ ] Accent-bold highlighting via `*...*`
- [ ] Inline size override tags for at least the user-requested `xs`
- [ ] Blink segments with reduced-motion-safe behavior
- [ ] One resolved date-time config contract, not both old and new surfaces at once

### Keep out of this milestone

- [ ] Generic rich text/markdown/HTML support in `Text`
- [ ] Full text layout engine rewrite across all fit modes
- [ ] Unlimited nested rich-format grammar
- [ ] Theme-specific hidden size lookup tables disconnected from typography bases

## Roadmap Implications

Recommended roadmap order for the new milestone:

1. Typography base-size contract cleanup
2. `Text` size semantics and regression coverage
3. Live shrink-fit measurement seam
4. Date-time config contract decision
5. Rich date-time parser and rendering
6. Blink accessibility and end-to-end coverage

The ordering matters because the date-time formatter will sit on top of the new text behavior. If the typography contract is still wrong, the formatter work will bake the wrong assumptions into its rich spans and tests.

## Primary Recommendation

Build one honest text contract instead of layering hacks over the current classes. Fix the typography base first, keep measured fitting narrow, and keep rich formatting local to the date-time widget until it proves itself.

---
*Research summary for: v1.3 typography scaling, live text fitting, and rich date-time formatting*
*Researched: 2026-05-28*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
