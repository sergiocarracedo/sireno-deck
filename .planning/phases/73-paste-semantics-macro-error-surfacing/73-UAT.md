---
status: complete
phase: 73-paste-semantics-macro-error-surfacing
source:
  - .planning/phases/73-paste-semantics-macro-error-surfacing/73-01-SUMMARY.md
  - .planning/phases/73-paste-semantics-macro-error-surfacing/73-02-SUMMARY.md
started: 2026-06-17T23:12:00Z
updated: 2026-06-17T23:50:00Z
---

## Current Test

number: 6
name: All unit tests pass
expected: |
  Running `pnpm vitest run packages/cli/src/util/clipboard.test.ts` passes
  (4 tests). Running `pnpm vitest run packages/cli/src/system/key-macro/`
  passes (19 tests). No regressions in modified files.
awaiting: pass

## Tests

### 1. pasteText code contract — clipboard write + keystroke

expected: |
  Source file `packages/cli/src/util/clipboard.ts` shows pasteText calling
  `clipboardy.writeSync(text)` (synchronous) and when a `keyMacroProvider` is
  provided, sends `keyMacroProvider.send(parseKeyMacro('ctrl+v'))` to simulate
  the OS paste keystroke.
result: pass

**Runtime gap found during UAT:** emoji-selector pasteText triggered
`ERR_MODULE_NOT_FOUND` for `../util/clipboard.js` under tsx runtime.
**Root cause:** runtime.ts:1009 used `await import('../util/clipboard.js')`
with literal `.js` extension; tsx doesn't resolve `.js`→`.ts` for dynamic
imports the way it does for static imports. Pre-existing — not introduced
by Phase 73.
**Fix:** replaced dynamic import with static `import { pasteText as doPaste } from '@/util/clipboard'` at runtime.ts:34. No circular dependency.
**Fix commit:** `5020ace`

### 2. pasteText error surfacing — runtime handler

expected: |
  Source file `packages/cli/src/deck/runtime.ts` shows the pasteText handler
  wrapping the clipboard call in try/catch and calling
  `showRuntimeButtonError(button, deckId, 'paste', error)` on failure.
result: pass

### 3. All 3 platform providers throw on failure

expected: |
  Source files `linux.ts`, `darwin.ts`, `windows.ts` in
  `packages/cli/src/system/key-macro/` each throw an Error when the underlying
  command fails, instead of silently swallowing or warn-only.
result: pass

### 4. keyMacro runtime handler error surfacing

expected: |
  Source file `packages/cli/src/deck/runtime.ts` shows the keyMacro handler
  wrapping `keyMacroProvider.send()` in try/catch and calling
  `showRuntimeButtonError(button, deckId, 'key-macro', error)` on failure.
result: pass

### 5. Error kinds and stable codes

expected: |
  `packages/cli/src/util/errors.ts` includes `"key-macro"` and `"paste"` in
  `RuntimeButtonErrorKind` with codes `'4110'` and `'4111'`.
result: pass

### 6. All unit tests pass

expected: |
  Running `pnpm vitest run packages/cli/src/util/clipboard.test.ts` passes
  (4 tests). Running `pnpm vitest run packages/cli/src/system/key-macro/`
  passes (19 tests). No regressions in modified files.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none — 1 gap found and fixed during UAT: dynamic `.js` import → static `@/util/clipboard` (commit `5020ace`)]
