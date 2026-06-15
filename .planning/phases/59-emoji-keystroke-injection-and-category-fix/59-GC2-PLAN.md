---
wave: 1
depends_on: []
gap_closure: true
files_modified:
  - packages/cli/src/system/key-macro/unsupported.ts
  - packages/cli/src/system/key-macro/index.ts
  - packages/cli/src/system/key-macro/unsupported.test.ts (if it exists; otherwise add one)
autonomous: true
objective: Make the `unsupported` key-macro provider's `send` throw a clear error so the runtime error UX surfaces a 4-digit code on the emoji button when the platform is unsupported (e.g. pure-Wayland). Closes test 3 gap from 59-UAT.md.
created: 2026-06-12
---

# 59-GC2 — Surface unsupported-platform as a real error

> Real UAT on a real Stream Deck (Linux/pure-Wayland) found: double-tap copies the shortcode to clipboard but does NOT paste. The paste keystroke silently no-ops. The user sees "clipboard updated but nothing happened" with no indication that the platform is unsupported.
>
> The CONTEXT decision was to "let any error propagate" — but the `unsupported` key-macro provider's `send` resolves immediately without throwing, so the runtime error UX never fires.

## Context

The `unsupported` key-macro provider is returned by `getKeyMacroProvider` for:
- Pure-Wayland sessions (`XDG_SESSION_TYPE === 'wayland' && !WAYLAND_DISPLAY`)
- Unknown platforms (`default` branch in the switch)

The provider's `send` currently:
- Reads `provider.send = async () => {}` (a no-op)
- `supportsKeyMacro: false`

The runtime's `pasteText` awaits the send without checking `supportsKeyMacro`, so the no-op resolves silently. The runtime error UX (warning triangle + 4-digit code) never gets triggered because no error was thrown.

The fix: make the `unsupported` provider's `send` throw a clear `Error` with a message that includes the unsupported reason (e.g. `'pure-wayland'`). The runtime's existing `try/catch` around `methods.pasteText` (in the addon's onTap handler) will catch it and surface the 4-digit code. The user will see exactly what went wrong.

## Tasks

### Task 1: Make unsupported provider throw

**File:** `packages/cli/src/system/key-macro/unsupported.ts`

Change the `send` implementation to throw. The error should be descriptive:
```typescript
send: async () => {
  throw new Error(
    `Keystroke simulation is not supported on this platform (${reason}). ` +
    `The clipboard write succeeded but no paste keystroke was sent. ` +
    `You can paste manually, or set 'paste.keystroke: false' in config.yml to skip the keystroke.`
  )
}
```

`reason` is the existing second constructor argument (e.g. `'pure-wayland'`, `'unknown-platform:foo'`). This gives the user a clear, actionable message.

### Task 2: Add a focused unit test

**File:** `packages/cli/src/system/key-macro/unsupported.test.ts` (new) or extend an existing test

Test that `send()` throws an Error with a message that mentions the reason (e.g. `'pure-wayland'`). Test that `supportsKeyMacro` is `false`. Test that the error message is descriptive enough for the user to understand.

### Task 3: Build and verify

**Action:** Run build and the key-macro test suite. The existing `runtime.test.ts` test #6 (`propagates keyMacroProvider.send errors to the runtime error UX`) already exercises this path with a custom throwing provider — that test should still pass.

**Verify:** `pnpm --filter sireno-deck-cli build` exits 0. `pnpm --filter sireno-deck-cli test src/system/key-macro` — all tests pass.

**Done:** The unsupported provider throws; the runtime error UX surfaces a 4-digit code on the emoji button when the platform doesn't support keystroke simulation.

## Must Haves

- [ ] `unsupported.ts` provider's `send` throws an Error that includes the unsupported reason
- [ ] The error message mentions the reason (e.g. `'pure-wayland'`) and is actionable
- [ ] New unit test covers the throw behavior
- [ ] Existing `runtime.test.ts` test #6 still passes (it uses a custom throwing provider, not the real unsupported one)
- [ ] Build is clean
