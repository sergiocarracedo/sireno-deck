# Phase 36: Remove Text Marquee — Research

**Date:** 2026-06-03
**Researcher:** plan-phase (sequential mode)

## Don't Hand-Roll

Nothing to build — this is a removal phase. The replacement `ellipsis` is already implemented in the codebase:
- `Text.tsx` line 268: `ellipsis: 'overflow-hidden whitespace-nowrap text-ellipsis'`
- This uses standard CSS `text-overflow: ellipsis` which requires `overflow: hidden` + `white-space: nowrap` — both already set via Tailwind classes [VERIFIED: MDN text-overflow docs]
- No external libraries or new patterns needed

## Common Pitfalls

### 1. Stale references causing compile errors
[VERIFIED: existing codebase structure]
Removing `'marquee'` from `TextFit` union will break any file that references the string literal `'marquee'` in a position typed as `TextFit`. Must audit all consumers before removal:
- `Text.tsx` — the type + fitModesClasses map (removal target)
- `media-player-button.tsx` — 2 consumer sites (must migrate)
- `dom-host.test.tsx` — 3-4 test assertions (must update)
- `theme.test.ts` — 1 fixture (must update)
- `media-player/index.test.ts` — 1 assertion (must update)
- `ButtonFrame.tsx` — `ThemeTextProps.fit` type (must narrow)

### 2. Leaving dead CSS behind
[VERIFIED: theme-utilities.ts inspection]
Remove not only the JS/TS references but also the CSS rules in `theme-utilities.ts`:
- `.sireno-text-fit-marquee`
- `.sireno-marquee-track`
- `@keyframes sireno-marquee-scroll`
- The `getSirenoRuntimeStylesheet()` function builds these dynamically — they become dead code with zero references.

### 3. Orphaned `data-sireno-*` attributes in tests
[VERIFIED: dom-host.test.tsx inspection]
Tests assert on `data-sireno-text-fit="marquee"` and `data-sireno-default-text-fit="marquee"`. Replace with `ellipsis` equivalents, not just removal — tests should still verify the data attributes flow correctly for the replacement fit mode.

## Existing Patterns in This Codebase

- **Text fit modes are a discriminated union** (`TextFit`) with a CSS class map (`fitModesClasses`) and conditional rendering branch for marquee's inner `<span>` — removal must touch all three.
- **Theme wrappers mirror component types** — `ThemeTextProps.fit` mirrors `TextFit`. They must stay in sync.
- **CSS is inlined in TypeScript** (`theme-utilities.ts`) via `getSirenoRuntimeStylesheet()` — no separate CSS files to update.
- **Test pattern** uses `renderDomDeck()` with button config objects — marquee assertions check both DOM attributes and CSS class names.

## Recommended Approach

1. Single atomic commit removing marquee from all files at once — type, render branch, CSS, consumers, tests. This prevents an intermediate compilation failure state.
2. Verify with `pnpm typecheck && pnpm test` to catch any missed references.
3. No migration period or deprecation — `'marquee'` was always a CSS hack on a 96x96px Stream Deck button. It is not part of any public API contract.
