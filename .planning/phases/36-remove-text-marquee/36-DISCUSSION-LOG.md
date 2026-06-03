# Phase 36: Remove Text Marquee — Discussion Log

**Date:** 2026-06-03
**Mode:** standard

## Areas Presented

1. **Migration: what replaces marquee for media-player?** — Not selected (user accepted default: ellipsis)
2. **Scope: type-only removal or full migration?** — Not selected (user accepted default: full removal + migration)
3. **Theme frame contract** — Selected and discussed
4. **All clear — skip discussion** — Not selected

## Area: Theme Frame Contract

### Decision Point: Should `ThemeTextProps.fit` be narrowed?

**Options considered:**
- **Narrow it** — Remove `'marquee'` from `ThemeTextProps.fit` in `ButtonFrame.tsx`. No external themes exist, and after `TextFit` drops `'marquee'`, the value can never arrive through the pipe.
- **Leave it** — Keep `'marquee'` in the type for backward compatibility with any external themes that might reference it.

**User choice:** Narrow it (Recommended)

**Rationale:** Since `Text` no longer accepts `'marquee'`, the theme wrapper will never receive it. Keeping it in the type is misleading dead code. No external themes exist in the project.

## Agent's Discretion Areas

- Media-player migration: `fit="marquee"` → `fit="ellipsis"` for title and artist
- CSS cleanup: remove marquee rules from `theme-utilities.ts`
- Test cleanup: replace marquee assertions with ellipsis equivalents

## Deferred Ideas

None.
