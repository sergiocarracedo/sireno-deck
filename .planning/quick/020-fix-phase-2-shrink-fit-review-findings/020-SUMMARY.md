# Quick Task 020 Summary

**Task:** Fix the Phase 2 shrink-fit review findings around font-load reruns and duplicate observer roots
**Completed:** 2026-05-29

## What was done

Hardened the browser-only shrink-fit helper so it now reruns when browser font metrics settle and so all scheduling/observer state is normalized onto one canonical browser-shell root.

The helper now resolves every incoming root (`document`, emulator mount, or deck shell descendants) through one `data-sireno-browser-shell="true"` canonical root before storing observer state or scheduling work. This closes the review finding where repeated emulator patch cycles could accumulate work against multiple effective roots.

It also now listens to the browser font-loading API when available:
- `document.fonts.ready.then(...)`
- `document.fonts.addEventListener('loadingdone', ...)`

That closes the review finding where shrink-fit could stay measured against fallback-font metrics after the real theme fonts finished loading.

Focused regressions in `packages/cli/src/render/dom-host.test.tsx` now lock both behaviors by asserting the emitted browser helper script contains the canonical-root selector/path and the font-settlement rerun hooks.

## Files changed

- `packages/cli/src/render/shrink-fit-browser-script.ts`
- `packages/cli/src/render/dom-host.test.tsx`

## Why it mattered

Phase 2 had already shipped the browser-only shrink-fit seam, but the review found two honest cracks in it:
- font metrics could change after first measurement when web fonts finished loading
- emulator patch cycles could route helper work through more than one effective root

Both bugs would make the contract look flakier than the docs claimed, especially on the real browser/emulator seam that Phase 2 explicitly shipped as review proof. This quick task tightens that seam without widening the public API or reopening the phase.

## Commits

- `c00a32f` `fix(quick-020): harden shrink-fit helper`
