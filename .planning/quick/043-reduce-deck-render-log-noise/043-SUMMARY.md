# Quick Task 043 Summary

**Task:** Reduce log noise from the per-frame "rendered browser-backed main deck" message.
**Completed:** 2026-06-09

## What was done

Demoted the per-render deck-render log in `writeBrowserRendererDeckSurface` from `info` to `debug` and inlined the 15-element `renderedKeys` array into a single summary line of the form `rendered browser-backed main deck (15 keys: 0-14)`. Min/max are derived from `buffersByKey.keys()`, so the format stays correct when fewer keys render.

## Files changed

- `packages/cli/src/cli/commands/start.ts:382-387` — replaced 8-line structured `logger.info` call with a 3-line inline `logger.debug` call (plus 2 lines of `minKey`/`maxKey` computation).

## Behaviour change

- Default log level: this message no longer prints.
- `LOG_LEVEL=debug`: prints on a single line instead of a 17-line multi-line JSON blob.
- No change to buffer writes or deck activation.

## Commit

`e2a7d4c` — refactor(quick-043): inline deck-render log to debug level
