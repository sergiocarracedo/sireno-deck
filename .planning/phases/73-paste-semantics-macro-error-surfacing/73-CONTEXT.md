---
phase: 73-paste-semantics-macro-error-surfacing
established: 2026-06-17
discuss_mode: standard
requirements: [BUG-05, BUG-06]
gray_areas_resolved:
  - paste-keystroke-mechanism
  - pasteText-error-handling
  - key-macro-error-surfacing
---

# Phase 73 — Paste semantics + macro error surfacing

## Scope

Two requirements from the v1.7 milestone, both fixing existing behavior that is broken or silent:

**BUG-05 — `pasteText` does not actually paste.** The current `pasteText(text)` at `packages/cli/src/util/clipboard.ts` only writes to clipboard via `clipboardy`. It never simulates the OS paste keystroke (Ctrl+V / Cmd+V). Fix: after writing to clipboard, reuse the existing `keyMacroProvider` to send the paste keystroke.

**BUG-06 — `keyMacroProvider` Linux path swallows xdotool failures.** The `linux.ts` provider catches xdotool errors at lines 91-93 with `// Non-fatal` and returns silently. The macOS and Windows providers log warnings but don't surface errors to the button UI. Fix: make all three providers throw on failure, and have the runtime `keyMacro` handler catch and surface the error via `showRuntimeButtonError`.

## Gray areas (resolved)

### paste-keystroke-mechanism

**Question:** How to simulate the OS paste keystroke? Options were: (a) reuse `keyMacroProvider.send(parseKeyMacro('ctrl+v'))`, (b) write a new platform-specific paste utility, (c) add a paste text method to each platform provider.

**Resolution:** Reuse `keyMacroProvider`. The provider already handles Ctrl/Command-key injection for all three platforms (Linux via `xdotool`, macOS via `osascript -e 'tell app ... keystroke ...'`, Windows via `powershell Add-Type ... SendKeys`). Adding a parallel paste mechanism duplicates the same platform detection and keystroke injection code. `keyMacroProvider.send(parseKeyMacro('ctrl+v'))` works for all three platforms today.

Note: `keyMacroProvider` can only inject keyboard shortcuts (Ctrl+V, Alt+Tab, etc.), not arbitrary text. Emoji paste (via emoji selector) correctly uses clipboard write + paste keystroke — the clipboard carries the arbitrary text, the keystroke triggers the OS paste. No change needed for the emoji selector path.

### pasteText-error-handling

**Question:** Which failures to surface and how?

**Resolution:** Both clipboard write and paste keystroke failures are surfaced. Clipboard write (`clipboardy.writeSync`) propagates synchronously — the `pasteText` async function catches and calls `showRuntimeButtonError`. Paste keystroke failure propagates through the `keyMacro` handler's existing catch block at `runtime.ts`, which already exists for `start`, `stop`, and `press` button types — extend it for the `paste` type as well.

### key-macro-error-surfacing

**Question:** How should platform providers surface errors to the button UI?

**Resolution:** All three providers (linux, darwin, windows) throw on failure instead of swallowing. The runtime `keyMacro` handler at `runtime.ts:408-413` catches `onSend()` rejects and calls `showRuntimeButtonError(error, button, deckId)` with a new `RuntimeButtonErrorKind` value: `"key-macro"`.

### Timing

No artificial delay between clipboard write and paste keystroke. The clipboard write is synchronous (`clipboardy.writeSync`), so the clipboard content is available immediately. The paste keystroke fires in the next microtask.

## Codebase context

### Key files

- `packages/cli/src/util/clipboard.ts` — `pasteText(text)` only calls `doPaste(text)` which does `clipboardy.writeSync(text)`. No keystroke simulation.
- `packages/cli/src/deck/runtime.ts:1008-1010` — `actions.paste` handler calls `doPaste(text)` from clipboard module.
- `packages/cli/src/deck/runtime.ts:412-413` — `keyMacro` handler calls `keyMacroProvider.send(...)` and catches errors.
- `packages/cli/src/deck/runtime.ts:792` — `showRuntimeButtonError(error, buttonType, deckId)` with `RuntimeButtonErrorKind` type.
- `packages/cli/src/deck/runtime.ts` — `RuntimeButtonErrorKind` definition. Current values: `"dbl-tap" | "hold" | "invalidate" | "navigateToDeck" | "press" | "refresh" | "release" | "render" | "tap"`. Need to add `"key-macro"`.
- `packages/cli/src/platform/linux.ts:91-93` — xdotool execa catch returns silently with `// Non-fatal`.
- `packages/cli/src/platform/darwin.ts:116-121` — osascript execa catch logs warning but doesn't throw.
- `packages/cli/src/platform/windows.ts:117-122` — powershell execa catch logs warning but doesn't throw.
- `packages/cli/src/device/key-macro/KeyMacroProvider.ts` — `send()` method has no button context parameter.

### Key constraints

- `pasteText` function name must be preserved (EMO-15 constraint).
- No new npm dependencies.
- The `keyMacroProvider` already exists and is wired at runtime — no new provider infrastructure needed.
- EMO-16/EMO-17 verification must be updated in REQUIREMENTS.md.
- Emoji selector calls `pasteText(':grinning:')` — this path will automatically benefit from the paste keystroke fix.
