# Plan 59-01 Summary

**Completed:** 2026-06-11

## What was built

Extended `methods.pasteText(text)` in `packages/cli/src/deck/runtime.ts` to call `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write(text)`. Closes EMO-15 and EMO-16. The platform paste key is selected via a `getPlatformPasteKey(osType)` helper: `linux` / `win32` → `'ctrl+v'`, `darwin` → `'cmd+v'`, `unsupported` → `null` (no-op). A new `pasteKeystrokeEnabled?: boolean` option on `DeckRuntimeOptions` lets callers opt out; default is `true`. Errors from `keyMacroProvider.send` propagate (no silent swallow). Closes the "tap emoji does nothing" bug end-to-end.

## Key files

- `packages/cli/src/deck/runtime.ts` — `pasteText` method body extended; new `pasteKeystrokeEnabled` closure variable; new `getPlatformPasteKey` helper next to the existing `markHop` from Phase 58; `DeckRuntimeOptions` interface gains `pasteKeystrokeEnabled?: boolean`.
- `packages/cli/src/deck/__tests__/runtime.test.ts` — 6 new focused unit tests added in the existing `describe("createDeckRuntime")` block, reusing the `createAddonRegistry({ listButtons: () => [], listDecks: () => [] })` mock pattern.

## Decisions made

- **Extend `methods.pasteText` in place; no new `sendText` method.** Single API, transparent to existing callers (emoji tap, emoji dbl-tap, `select_command` substitution all get the fix).
- **Throw on `keyMacroProvider.send` failure.** Per CONTEXT.md D-NN decision: let the runtime error UX (warning triangle + 4-digit code from Phase 5) surface the failure rather than swallowing it.
- **Mock `keyMacroProvider` in unit tests; defer real-platform integration to manual UAT.** Real xdotool/osascript/SendInput in CI is fragile; the user's Stream Deck host is the right test environment.
- **6 new unit tests cover the full cross-platform surface:** linux (ctrl+v), darwin (cmd+v), win32 (ctrl+v), opt-out (`pasteKeystrokeEnabled: false`), error propagation (send throws), unsupported platform (no-op).

## Notes for downstream

- `pasteKeystrokeEnabled` defaults to `true` — most callers do not need to set it explicitly. The opt-out path is for the `keyMacroProvider` throw-on-send case.
- Plan 59-02 wires the config-level `paste.keystroke: false` opt-out through the SirenoConfig schema → `start.ts` → `createDeckRuntime` options. This plan (59-01) only adds the runtime option; the config surface is added in 59-02.
- The `keyMacroProvider` is already constructed in `runtime.ts:390-392` (Phase 57 follow-on); this plan reuses the existing construction path.
- Real-hardware UAT is deferred to the user's Stream Deck host (per CONTEXT.md decisions and 59-VERIFICATION.md § Hardware caveat).
