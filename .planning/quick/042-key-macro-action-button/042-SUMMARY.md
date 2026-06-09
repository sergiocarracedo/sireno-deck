# Quick Task 042 Summary

**Task:** Allow the bundled action button to emit keyboard keystrokes (macros) via a new `key-macro` prop, mutually exclusive with `commands`. Centralize the OS abstraction, pause logic, and parsing in `core` so any addon can reuse it.
**Completed:** 2026-06-09

## What was done

- Added a new `system/key-macro/` package: typed `KeyMacroStep` (key + modifiers, or wait), `KeyMacroProvider` interface, and an injectable `KeyMacroExecutor` (default shells out via `execa`, override for tests).
- Implemented platform-specific providers that mirror the `system/active-app/` pattern: macOS via `osascript` `System Events`, Linux via `xdotool key --clearmodifiers`, Windows via PowerShell `System.Windows.Forms.SendKeys`, plus an unsupported no-op that warns once. Pure-Wayland is detected and treated as unsupported.
- Wrote a `parseKeyMacro` DSL: comma-separated tokens; `+` joins modifiers (`ctrl`, `cmd`, `meta`, `alt`, `shift`, `win`, `super`); `wait <n>ms|s` introduces a delay. Errors throw a typed `KeyMacroParseError`. Exported from the package root and from `src/index.ts` for addon reuse.
- Expanded `AddonButtonActionConfigSchema` with `key_macro` (string OR per-gesture `{ tap, hold, 'double-tap' }`) and a `superRefine` that rejects setting both `commands` and `key_macro`. Other addons (date-time, system-status, emoji-selector) still use `AddonButtonActionConfigSchema.shape` to extend their own schemas.
- Added `keyMacro: (sequence) => Promise<void>` to `AddonButtonMethods` and wired it in the runtime: instantiates a `getKeyMacroProvider(...)` once, parses the sequence, sends it. The provider is overridable via `DeckRuntimeOptions.keyMacroProvider` for tests.
- Rewrote the bundled action button (`core-buttons/buttons/action.tsx`) to route to `keyMacro` when `key_macro` is set, falling back to `commands` otherwise. Per-gesture routing for `tap` / `hold` / `double-tap` works with both the string form and the per-gesture object.
- Added 5 new tests covering schema parsing, mutual-exclusion rejection, gesture dispatch, and the runCommand non-fallthrough.
- Resolved a pre-existing merge conflict in `runtime.ts` (WIP phase 17/18 work) by taking the upstream side, per user direction.

## Files changed

- `packages/cli/src/system/key-macro/{provider,parser,unsupported,darwin,linux,windows,index}.ts` (new) + tests
- `packages/cli/src/addon/api.ts` — `keyMacro` on methods, `key_macro` on config schema, mutual-exclusion refine, `AddonButtonKeyMacro*` exports
- `packages/cli/src/index.ts` — re-export `parseKeyMacro`, `KeyMacroProvider`, `KeyMacroStep`, `AddonButtonKeyMacro`, `AddonButtonKeyMacroSchema`
- `packages/cli/src/deck/runtime.ts` — import + instantiate provider, wire `methods.keyMacro`, accept `keyMacroProvider` in `DeckRuntimeOptions`, resolve pre-existing merge conflict
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` — gesture handlers route to `keyMacro` when set
- `packages/cli/src/builtin-addons/core-buttons/index.test.ts` — `keyMacro` + `pasteText` on test harness, 5 new tests

## Commits

- `87a0197` feat(quick-042): core key-macro package (parser + OS provider scaffold)
- `e2575c0` feat(quick-042): wire keyMacro into action button + runtime methods
- `a9cffb0` test(quick-042): key_macro parsing, mutual-exclusion, and gesture dispatch
