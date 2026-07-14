# P1 Research: paste:// Fix

## Implementation Approach

The fix is a two-line change in `packages/cli/src/deck/methods.ts`. The `keyMacroProvider` is already in `MethodsContext` (optional, line 31) and already used by `keyMacro()` (lines 99-129). The `sendKey("ctrl+v")` pattern already exists in this file — line 106, 115, 128. Platform providers (Linux via xdotool/ydotool/dotool, Darwin via osascript, Windows via PowerShell) all parse combos via `parseCombo`, so `ctrl+v` maps correctly per-platform (ctrl → `command down` on macOS).

**Current `pasteText` (lines 131-138):**
```ts
const pasteText: Methods["pasteText"] = async (text) => {
  if (clipboardProvider === undefined) {
    throw new NotImplementedError(
      "methods.pasteText requires a clipboardProvider (set via methods.setClipboardProvider)",
    )
  }
  await clipboardProvider.writeText(text)
}
```

**Required change:**
```ts
const pasteText: Methods["pasteText"] = async (text) => {
  if (clipboardProvider === undefined) {
    throw new NotImplementedError(
      "methods.pasteText requires a clipboardProvider (set via methods.setClipboardProvider)",
    )
  }
  await clipboardProvider.writeText(text)
  await keyMacroProvider?.sendKey("ctrl+v")
}
```

The optional chaining `?.` handles graceful degradation: if `keyMacroProvider` is undefined, the expression short-circuits to `undefined` and `await undefined` is a no-op. Clipboard write still succeeds. If the provider IS available but `sendKey` throws, the error propagates — which is correct behavior (the caller should know the paste keystroke failed even though clipboard write succeeded).

## Pitfalls

### 1. Await ordering — clipboard MUST write before keystroke fires
**What goes wrong:** Running `sendKey` in parallel with `writeText` via `Promise.all` could fire the Ctrl+V before the clipboard has the new content, pasting stale clipboard data.
**How to avoid:** Sequential `await` — the ROADMAP explicitly requires this. The implementation above does `await writeText` then `await sendKey`, which is correct. No parallelism needed.

### 2. `sendKey` error after successful clipboard write
**What goes wrong:** If `sendKey` throws (e.g., xdotool not found, permission denied), the user sees an error even though the clipboard write succeeded. They might retry the whole operation and get a duplicate clipboard write.
**How to avoid:** The ROADMAP lists error logging as a nice-to-have, not a must-have. The current approach (let error propagate) is correct — the caller should know something failed. Adding try/catch with logging is optional polish for later.

### 3. `ctrl+v` vs platform-specific key
**What goes wrong:** Thinking `ctrl+v` is Linux-only. It's not — the platform providers handle the mapping: Darwin maps `ctrl` → `command down`, Windows maps `ctrl` to `^` prefix. The ROADMAP explicitly says "ctrl+v as the universal combo (platform providers handle mapping)".
**How to avoid:** Pass `"ctrl+v"` as the string. Do NOT add platform detection logic.

### 4. Existing test for `dispatch routes paste:// to pasteText` will break
**What goes wrong:** The test at `methods.test.ts:134-146` sets up only `clipboardProvider`, not `keyMacroProvider`. With the change, `sendKey` is called via optional chaining so it won't throw, but the test won't verify `sendKey` was called. The test still passes but doesn't cover the new behavior.
**How to avoid:** Add new tests that explicitly verify both providers are called. The existing test stays as-is to verify graceful degradation (no keyMacroProvider → no throw).

## Existing Patterns in This Codebase

- **`keyMacro()` method (lines 99-129):** Shows the canonical pattern for using `keyMacroProvider` — check for undefined first, then call `sendKey()`. The `pasteText` version can be simpler because graceful degradation (no throw) is acceptable here.
- **Test setup pattern (`methods.test.ts:14-36`):** `setup()` creates a minimal `MethodsContext` without providers. Tests then call `methods.setKeyMacroProvider(...)` or `methods.setClipboardProvider(...)` to wire them in. Follow this exact pattern.
- **Mock provider pattern (`methods.test.ts:88-89`):** `{ sendKey: vi.fn().mockResolvedValue(undefined), stop: async () => undefined }` — standard mock shape. Same for clipboard: `{ writeText: vi.fn(), readText: async () => "", stop: async () => undefined }`.
- **`createNullKeyMacroProvider` (`key-macro.ts:14-34`):** Exists for when platform has no key-macro support. The `pasteText` change does NOT need this — `keyMacroProvider` being undefined is the "unavailable" case.

## Test Strategy

Three new tests in `packages/cli/src/deck/__tests__/methods.test.ts`:

1. **Both providers called:** Wire both `clipboardProvider` and `keyMacroProvider`, call `pasteText("hello")`, assert `writeText("hello")` AND `sendKey("ctrl+v")` both called.

2. **Graceful degradation without keyMacroProvider:** Wire only `clipboardProvider` (no `keyMacroProvider`), call `pasteText("hello")`, assert `writeText("hello")` called, no throw. (This already exists at line 110-122 — it still passes without changes.)

3. **Emoji round-trip through dispatch:** Wire both providers, call `dispatch("paste://🔥")`, assert `writeText("🔥")` and `sendKey("ctrl+v")` both called.

Optional: a test verifying `dispatch("paste://🔥")` works with only clipboardProvider (no keyMacroProvider) — the existing test at line 134-146 already covers this.

## Verification

1. **Unit tests:** Run `pnpm test` in `packages/cli` — all existing tests pass, 2-3 new tests pass.
2. **TypeScript:** Run `pnpm typecheck` — no type errors (optional chaining on `KeyMacroProvider | undefined` is type-safe).
3. **Manual (if Stream Deck hardware available):** Tap an emoji → verify clipboard has emoji AND emoji appears in target app. Without keyMacroProvider: verify clipboard write still works.
