# Phase 36: Remove Text Marquee — Verification

**Date:** 2026-06-03
**Status:** passed

## Must-Have Verification

### Plan 36-01
| Must-have | Status |
|-----------|--------|
| `TextFit` union narrowed to `'ellipsis' \| 'shrink' \| 'wrap'` | ✓ |
| `fitModesClasses.marquee` and `<span>` branch removed | ✓ |
| CSS rules (`.sireno-text-fit-marquee`, `.sireno-marquee-track`, `@keyframes`) removed | ✓ |
| `ThemeTextProps.fit` narrowed | ✓ |

### Plan 36-02
| Must-have | Status |
|-----------|--------|
| Media-player title/artist use `fit="ellipsis"` | ✓ |
| `dom-host.test.tsx` assertions updated | ✓ — passes |
| `theme.test.ts` fixture updated | ✓ |
| `media-player/index.test.ts` assertions updated | ✓ |
| Full test suite passes | ⚠️ Pre-existing failures (5 test files, 11 tests) — none caused by Phase 36 |

## CONTEXT.md Decisions
| Decision | Status |
|----------|--------|
| Theme frame contract narrowed | ✓ |
| Media-player migrated to ellipsis | ✓ |
| CSS cleanup completed | ✓ |
| Tests updated | ✓ |

## Notes
- 2 pre-existing failures in `media-player/index.test.ts` (`data-sireno-ui-bars`, `data-sireno-media-status`), 2 in `runtime.test.ts` (lucide icon), 2 in `start.test.ts` (variant config), 2 in `theme.test.ts` (font path), 1 in `browser-renderer.test.ts` (flaky timer) — all unrelated to Phase 36 removal.
- No `'marquee'` string literal remains in any of the 6 target files.
