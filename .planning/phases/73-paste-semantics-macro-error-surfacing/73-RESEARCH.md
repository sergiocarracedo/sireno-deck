# Phase 73: Paste semantics + macro error surfacing — Research

**Researched:** 2026-06-17
**Phase goal:** `pasteText` actually simulates the OS paste keystroke; `keyMacroProvider` failures surface through runtime-button-error helper.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| Simulating OS paste keystroke | Reuse existing `keyMacroProvider.send(parseKeyMacro('ctrl+v'))` | Key-macro provider already handles platform detection and keystroke injection for all 3 OSes (xdotool on Linux, osascript on macOS, SendKeys on Windows). Adding a parallel paste mechanism duplicates injection + platform detection. | [VERIFIED: codebase scan] |
| Clipboard write | Use existing `clipboardy.writeSync` (not `write` async) | Clipboard must be populated before keystroke fires. `writeSync` blocks until clipboard is ready — no delay needed. clipboardy v4.0.0 is already a dependency. | [VERIFIED: npm registry] [VERIFIED: codebase scan] |
| Error surfacing for failures | Reuse `showRuntimeButtonError` + `RuntimeButtonErrorKind` | Existing error helper at `runtime.ts:792` already renders errors on buttons. Add a new `"key-macro"` kind to the union type at `util/errors.ts:9`. | [VERIFIED: codebase scan] |

## Common Pitfalls

### Adding artificial delay between clipboard write and paste keystroke
**What goes wrong:** Developers add `setTimeout(100)` or similar between clipboard write and paste keystroke.
**Why:** Clipboard writes via `clipboardy` on modern systems are synchronous at the OS level. `clipboardy.writeSync` returns only when the clipboard content is available. No delay is needed.
**How to avoid:** Call `clipboardy.writeSync(text)`, then immediately call `keyMacroProvider.send(parseKeyMacro('ctrl+v'))`. No await-guard or timer between the two.

### pasteText async should use writeSync for the clipboard part
**What goes wrong:** Using `clipboardy.write(text)` (async) then immediately sending the keystroke before the clipboard promise resolves.
**Why:** The async write resolves asynchronously; the keystroke may fire before the clipboard is populated.
**How to avoid:** Either `await clipboardy.write(text)` before firing the keystroke, or use `clipboardy.writeSync(text)` + then fire keystroke. The discuss-phase chose sync write + immediate keystroke.

### Throwing from providers may break existing callers
**What goes wrong:** The `keyMacro` handler at `runtime.ts:1013` currently has no try/catch around `keyMacroProvider.send(steps)`. If providers start throwing, the unhandled rejection will propagate up.
**Why:** Providers currently only log warnings (darwin, windows) or silently swallow (linux). Callers don't expect throws.
**How to avoid:** Add try/catch in the runtime `keyMacro` handler to catch provider throws and call `showRuntimeButtonError`. This is the same pattern used for `navigateToDeck` (lines 1002-1004).

### Button context not available in provider.send()
**What goes wrong:** KeyMacroProvider.send() has no button context parameter — the provider doesn't know which button triggered the macro.
**Why:** The provider interface at `provider.ts:12` defines `send(sequence: readonly KeyMacroStep[]): Promise<void>` — no button/error context.
**How to avoid:** Don't change the provider interface. The error surfacing happens at the runtime handler level where button context IS available (loop closure in `createInternalButtonHandler`).

## Existing Patterns in This Codebase

- **`RuntimeButtonErrorKind`** at `packages/cli/src/util/errors.ts:9` — union type of 9 error kinds. Add `"key-macro"` here.
- **`showRuntimeButtonError`** at `packages/cli/src/deck/runtime.ts:792` — takes `(button, deckId, operation, error)`. Already used for `navigateToDeck`, `press`, `tap`, `render`, etc.
- **`navigateToDeck` error handling** at `runtime.ts:1000-1006` — try/catch around navigation, calls `showRuntimeButtonError` on failure. The pattern to replicate for keyMacro.
- **`keyMacroProvider` wiring** at `runtime.ts:412-414` — created during runtime factory with a default warn-only logger. Used at line 1015.
- **`clipboard.ts`** at `packages/cli/src/util/clipboard.ts` — `pasteText(text)` is async, calls `clipboardy.write(text)`. Modify to add paste keystroke.
- **Platform key-macro providers** at `packages/cli/src/system/key-macro/{linux,darwin,windows}.ts` — each has a `send()` method that currently swallows errors. Modify to throw on failure.
- **`KeyMacroExecutor`** at `provider.ts:19-21` — `run(program)` returns `{ code, failed }`. The `failed` boolean is derived from non-zero exit codes.
- **pasteText handler** at `runtime.ts:1008-1010` — currently imports `pasteText` from clipboard module and calls it. No error handling — clipboardy throws reject on clipboard failure. Should wrap in try/catch.
- **keyMacro handler** at `runtime.ts:1013-1016` — calls `keyMacroProvider.send(steps)` with no try/catch.

## Recommended Approach

Two independent but parallel changes:

1. **BUG-05 (pasteText):** Modify `pasteText` in `clipboard.ts` — after the clipboard write, accept a `keyMacroProvider` parameter (or import the getter) and call `keyMacroProvider.send(parseKeyMacro('ctrl+v'))`. Use `clipboardy.writeSync` for the clipboard write to ensure it's populated before the keystroke. The runtime `pasteText` handler at line 1008 should wrap in try/catch and call `showRuntimeButtonError` on failure.

2. **BUG-06 (error surfacing):** Modify all three platform providers to throw on failure instead of swallowing. Add `"key-macro"` to `RuntimeButtonErrorKind`. Add try/catch in the runtime `keyMacro` handler at line 1013 that catches provider throws and calls `showRuntimeButtonError` with the new kind. Do NOT change the provider interface — the error context is available at the caller level in runtime.ts.
