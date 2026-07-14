# P1: paste:// Fix

## Goal
Make `paste://` write text to the clipboard AND simulate Ctrl+V keystroke so pasted content appears in the active application.

## Must-Haves
- [ ] `pasteText()` calls `clipboardProvider.writeText(text)` then `keyMacroProvider.sendKey("ctrl+v")` sequentially
- [ ] If `keyMacroProvider` is undefined, clipboard write still succeeds (graceful degradation via optional chaining)
- [ ] `dispatch("paste://🔥")` triggers both clipboard write and keystroke
- [ ] All existing tests pass unchanged
- [ ] New tests verify both providers called, graceful degradation, and emoji round-trip

## Tasks

### Task 1: Add keystroke simulation to pasteText()
**Files:** `packages/cli/src/deck/methods.ts`
**Depends on:** None

Add one line after `await clipboardProvider.writeText(text)` on line 137:

```ts
await keyMacroProvider?.sendKey("ctrl+v")
```

This is the entire implementation. Optional chaining (`?.`) handles graceful degradation — if `keyMacroProvider` is undefined, `await undefined` is a no-op. Sequential `await` ensures clipboard write completes before keystroke fires.

No other changes needed. `keyMacroProvider` is already in scope (line 59), already typed as `KeyMacroProvider | undefined` (line 31 of `MethodsContext`), and `sendKey` is already used throughout this file (lines 106, 115, 128).

### Task 2: Add tests for paste keystroke behavior
**Files:** `packages/cli/src/deck/__tests__/methods.test.ts`
**Depends on:** Task 1

Add two new tests after the existing "pasteText calls the provider's writeText when wired" test (line 122):

1. **"pasteText calls sendKey after writeText when keyMacroProvider is wired"** — Wire both providers, call `pasteText("hello")`, assert `writeText("hello")` called AND `sendKey("ctrl+v")` called.

2. **"dispatch paste:// calls both writeText and sendKey"** — Wire both providers, call `dispatch("paste://🔥")`, assert `writeText("🔥")` AND `sendKey("ctrl+v")` called.

The existing "dispatch routes paste:// to pasteText" test (line 134) already covers graceful degradation (no keyMacroProvider → writeText still called, no throw). No changes to existing tests.

## Verification
1. `pnpm test` in `packages/cli` — all existing + 2 new tests pass
2. `pnpm typecheck` — no type errors
