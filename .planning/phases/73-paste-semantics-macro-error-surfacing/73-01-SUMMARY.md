# Plan 73-01 Summary

**Completed:** 2026-06-17

## What was built

BUG-05 fix: `pasteText` now writes to clipboard via `clipboardy.writeSync` (synchronous — guarantees clipboard is populated before keystroke) then sends Ctrl+V/Cmd+V paste keystroke via `keyMacroProvider.send(parseKeyMacro('ctrl+v'))`. New `"paste"` error kind (code `4111`). The runtime `pasteText` handler wraps in try/catch and calls `showRuntimeButtonError` on failure.

## Key files

- `packages/cli/src/util/clipboard.ts`: pasteText now accepts optional `keyMacroProvider` param; uses `writeSync` + sends paste keystroke
- `packages/cli/src/deck/runtime.ts`: pasteText handler passes `keyMacroProvider` to `doPaste`, catches errors via `showRuntimeButtonError`
- `packages/cli/src/util/errors.ts`: `"paste"` added to `RuntimeButtonErrorKind` and `RUNTIME_BUTTON_ERROR_CODES`

## Decisions made

- Used `clipboardy.writeSync` instead of `await clipboardy.write` — avoids timing window where clipboard isn't populated before keystroke fires
- Error code 4111 for paste (above the existing 4101-4109 range)

## Notes for downstream

- Emoji selector and any addon using `pasteText` automatically benefit — no per-addon changes needed
