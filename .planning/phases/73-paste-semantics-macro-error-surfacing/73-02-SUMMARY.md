# Plan 73-02 Summary

**Completed:** 2026-06-17

## What was built

BUG-06 fix: All 3 platform key-macro providers (linux.ts, darwin.ts, windows.ts) now throw `Error` on failure instead of silently swallowing. New `"key-macro"` error kind (code `4110`). The runtime `keyMacro` handler catches provider throws and calls `showRuntimeButtonError`, making failures visible on the button surface.

## Key files

- `packages/cli/src/system/key-macro/linux.ts`: `runCommand` throws on xdotool failure
- `packages/cli/src/system/key-macro/darwin.ts`: `send()` throws on osascript failure
- `packages/cli/src/system/key-macro/windows.ts`: `send()` throws on powershell failure
- `packages/cli/src/deck/runtime.ts`: keyMacro handler wraps `provider.send()` in try/catch

## Decisions made

- Error code 4110 for key-macro (above the existing 4101-4109 range)
- All 3 providers throw `Error` with consistent `key-macro:` prefix for message readability on button surface

## Notes for downstream

- Errors now surface on the button even when the platform macro tool (xdotool/osascript/powershell) is missing or fails
