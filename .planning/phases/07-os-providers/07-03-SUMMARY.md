---
phase: 07-os-providers
plan: 07-03
wave: 2
depends_on: [07-01-PLAN]
files_created:
  - packages/cli/src/system/active-app/{darwin.ts,darwin.test.ts}
  - packages/cli/src/system/session-monitor/{darwin.ts,darwin.test.ts}
  - packages/cli/src/system/key-macro/{darwin.ts,darwin.test.ts}
  - packages/cli/src/system/media/{darwin.ts,darwin.test.ts}
files_modified:
  - packages/cli/src/system/active-app/index.ts
  - packages/cli/src/system/session-monitor/index.ts
  - packages/cli/src/system/key-macro/index.ts
  - packages/cli/src/system/media/index.ts
autonomous: true
---

# Phase 07 Plan 03 — macOS Implementations

## What was built

- `active-app/darwin.ts` — `osascript` System Events query for the frontmost process. Polls every 1s, 1s+ cache, parses `{name, title, pid}` comma-separated output.
- `session-monitor/darwin.ts` — `osascript` `tell application "System Events" to get running of loginwindow process` for locked state. Polls every 5s. No idle (per CONTEXT C.1, missing capability = "unknown").
- `key-macro/darwin.ts` — `osascript keystroke` with `using {command down, ...}`. Modifier aliases: `ctrl → command`, `alt → option`, `meta → command`. Literal text passed through unchanged. Emojis supported (osascript handles UTF-8).
- `media/darwin.ts` — `osascript` Spotify for transport (play/pause/playpause/next/previous track) and metadata (`{name, artist, album}`). `artUrl` is null (Spotify's AppleScript bridge doesn't expose it). 2s `onChange` poll.
- All 4 `index.ts` barrels updated to dispatch `darwin` to the new impls.

## Tests added (18)

- `active-app/darwin.test.ts` (4): parses osascript, returns last on failure, null on empty, stop clears interval
- `session-monitor/darwin.test.ts` (4): initial locked, initial unlocked, subscriber on change, stop halts
- `key-macro/darwin.test.ts` (5): ctrl→command remap, alt+shift, literal text, emoji, EXEC_FAILED
- `media/darwin.test.ts` (5): play, pause, getCurrent parses Spotify record, null on empty, onChange on track change

## must_haves

- [x] `darwin.ts` files for all 4 capabilities
- [x] `index.ts` factory files dispatch `darwin` to the new impls
- [x] All 4 macOS providers work end-to-end against the Plan 01 interfaces
- [x] Locked state detection via osascript loginwindow
- [x] Key-macro: ctrl→command remap, emoji passthrough
- [x] Media: Spotify osascript + 2s onChange poll
- [x] All tests pass (18 new)
- [x] typecheck + lint clean (0 warnings)

## Notes for downstream

- Plan 04 (Windows) follows the same pattern. The `CommandExecutor` interface is reused.
- `getWindowsActiveAppProvider` and friends would be tested on Windows only; in this dev env (Linux), PowerShell calls fail but the executor mock verifies the right commands are issued.
- All osascript invocations include a 2-5s timeout via `withTimeout` to prevent hangs.
