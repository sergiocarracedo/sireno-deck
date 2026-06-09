# Quick Task 042: key-macro action button - Plan

**Task:** Allow the bundled action button to emit keyboard keystrokes (macros) via a new `key-macro` prop, mutually exclusive with `commands`. Centralize the OS abstraction, pause logic, and parsing in `core` so any addon can reuse it.

## Design Decisions

- **Macro syntax:** DSL string. Sequence of keys separated by `,`. Modifier prefix `+` (e.g. `ctrl+c` = Ctrl down, C, Ctrl up). Special token `wait <ms>` introduces a delay (default unit `ms`; also accept `s`). Plain whitespace is ignored. Examples: `"ctrl+c"`, `"cmd+space, wait 200ms, vscode"`, `"alt+Tab, alt+Tab"`.
- **OS abstraction:** New `system/key-macro/` package, mirroring `system/active-app/` (provider + darwin/linux/windows/unsupported + `getKeyMacroProvider` factory). Each provider exposes `supportsKeyMacro` and `sendKeySequence(sequence: KeyMacroStep[]): Promise<void>`.
- **Backends (no new deps):**
  - **macOS:** shell out to `osascript` with a generated AppleScript that uses `keystroke` / `key code` (modifier + key pairs).
  - **Linux:** shell out to `xdotool key …` (one invocation per step; includes `--clearmodifiers` to avoid sticky modifiers).
  - **Windows:** shell out to PowerShell `Add-Type` with `System.Windows.Forms.SendKeys` (loaded once, cached per process).
  - **Unsupported:** log once and no-op (like `active-app`).
- **Mutual exclusion:** `AddonButtonActionConfigSchema` becomes a discriminated union (or refine with `.refine`) so `key-macro` + `commands` is rejected at config validation time.
- **Where it lives in the API:** Add `keyMacro: (sequence: string) => Promise<void>` to `AddonButtonMethods`. Runtime provides it via a new `createKeyMacroProvider` instantiated from `hostContext`. The action button calls `methods.keyMacro(config.key_macro)` instead of `methods.runCommand` when the macro is present.
- **Reusability:** The parser and provider are exposed in `core` (and re-exported via `src/index.ts`) so any addon can compose them; the action button is the only built-in consumer for now.

## Architecture

```
src/system/key-macro/
  provider.ts         # KeyMacroStep, KeyMacroProvider interface
  parser.ts           # parseKeyMacro(src) -> KeyMacroStep[] (zod-validated by callers)
  darwin.ts           # osascript backend
  linux.ts            # xdotool backend
  windows.ts          # SendKeys backend
  unsupported.ts      # no-op + warn
  index.ts            # getKeyMacroProvider + re-exports
  parser.test.ts      # parser unit tests
  get-provider.test.ts
```

## Files to change

1. `packages/cli/src/system/key-macro/provider.ts` (new)
2. `packages/cli/src/system/key-macro/parser.ts` (new)
3. `packages/cli/src/system/key-macro/parser.test.ts` (new)
4. `packages/cli/src/system/key-macro/darwin.ts` (new)
5. `packages/cli/src/system/key-macro/linux.ts` (new)
6. `packages/cli/src/system/key-macro/windows.ts` (new)
7. `packages/cli/src/system/key-macro/unsupported.ts` (new)
8. `packages/cli/src/system/key-macro/index.ts` (new)
9. `packages/cli/src/system/key-macro/get-provider.test.ts` (new)
10. `packages/cli/src/addon/api.ts` — add `keyMacro` to `AddonButtonMethods`; expand `AddonButtonActionConfigSchema` to support `key_macro` with mutual-exclusion refine
11. `packages/cli/src/index.ts` — re-export `parseKeyMacro` and `KeyMacroStep`/`KeyMacroProvider`
12. `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` — use `keyMacro` when set, fall back to `commands`
13. `packages/cli/src/deck/runtime.ts` — instantiate `keyMacroProvider` in `createRuntimeOptions` and wire `methods.keyMacro` in `createButtonMethods`
14. `packages/cli/src/builtin-addons/core-buttons/index.test.ts` — add tests covering key-macro path and mutual exclusion

## Plan: 3 tasks

### Task 1 — Core key-macro package (parser + OS provider scaffold)

**Files:** `packages/cli/src/system/key-macro/{provider,parser,unsupported,darwin,linux,windows,index}.ts` + `parser.test.ts` + `get-provider.test.ts`

**Action:**
- `provider.ts`: define `KeyMacroStep` union (`{ type: 'key'; key: string; modifiers: string[] } | { type: 'wait'; delayMs: number }`), `KeyMacroProvider` (`{ supportsKeyMacro: boolean; send(sequence): Promise<void> }`), and `KeyMacroProviderDeps { logger }`.
- `parser.ts`: implement `parseKeyMacro(src: string): KeyMacroStep[]`. Token rules:
  - Trim, split on `,`.
  - Token `wait <n>(ms|s)` -> `{ type: 'wait', delayMs }`. Default unit `ms`. Default fallback: if a bare integer is the token, treat as `wait <n>ms`.
  - Token `+`-separated parts -> first parts are modifiers (`ctrl|cmd|meta|alt|shift|win|super`), last part is the key. Empty modifier segment is an error.
  - Unknown tokens throw a descriptive `Error`.
- `darwin.ts`: produce an AppleScript that uses `keystroke` for printable keys, `key code` for special keys. If modifiers present, prefix with `keystroke "x" using {command down, shift down}`. Execute via `execa("/usr/bin/osascript", ["-e", script])`.
- `linux.ts`: for each step emit `xdotool key <modifiers>+<key>` (modifier join `+`), with `--clearmodifiers` flag once at start of batch. For `wait` step use `sleep 0.<ms>/1000` shell command (or use `execa` with `sleep`). 
- `windows.ts`: build a SendKeys string (`+` for shift, `^` for ctrl, `%` for alt, `#` for win) — render each `key` step to its SendKeys representation, with `~` for Enter etc. Send via PowerShell `Add-Type` + `SendKeys.SendWait`. Cache the loaded assembly across calls (module-level `boolean loaded`).
- `unsupported.ts`: mirror `active-app/unsupported.ts` (warn once, no-op).
- `index.ts`: `getKeyMacroProvider({ platform?, env?, logger })` returning the right provider, default `process.platform`.
- Tests: parser covers single key, modifier+key, multi-step, wait, errors. `get-provider.test.ts` covers platform dispatch + warn-once.

**Verify:** `pnpm --filter sireno-deck-cli test src/system/key-macro` passes.

**Done:** Provider + parser exported from `system/key-macro`, dispatching works, parser covers all grammar edges.

### Task 2 — API surface (methods + schema + runtime wiring)

**Files:** `packages/cli/src/addon/api.ts`, `packages/cli/src/index.ts`, `packages/cli/src/deck/runtime.ts`

**Action:**
- `addon/api.ts`:
  - Add `keyMacro?: string` to `AddonButtonActionCommandsSchema` shape — actually, expand to a config object: `AddonButtonActionConfigSchema = z.object({ commands: AddonButtonActionCommandsSchema.optional(), key_macro: z.string().min(1).optional() }).refine(both-or-neither, …)`.
  - Add `keyMacro: (sequence: string) => Promise<void>` to `AddonButtonMethods`.
  - Export `useButtonActionCommand` unchanged — action button code will decide which to call.
- `src/index.ts`: re-export `parseKeyMacro`, `KeyMacroStep`, `KeyMacroProvider` from `system/key-macro`.
- `deck/runtime.ts`:
  - Add `executeKeyMacro` option on `CreateRuntimeOptions` (defaults to a function that calls `parseKeyMacro` + `provider.send`); build a `keyMacroProvider` once from `hostContext` (or use a factory option for testability).
  - In `createButtonMethods`, add `keyMacro: async (sequence) => { const steps = parseKeyMacro(sequence); await keyMacroProvider.send(steps); }`.

**Verify:** `pnpm --filter sireno-deck-cli typecheck` (via `pnpm run build` or tsc) passes; existing runtime tests still pass.

**Done:** `methods.keyMacro` available; schema rejects `key_macro` + `commands` together.

### Task 3 — Action button + tests

**Files:** `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`, `packages/cli/src/builtin-addons/core-buttons/index.test.ts`

**Action:**
- `action.tsx`: schema inherits from `AddonButtonActionConfigSchema` (which now includes the mutual-exclusion refine). In `onTap/onDblTap/onHold`, prefer `key_macro` when set: `if (config.key_macro) await methods.keyMacro(config.key_macro); else if (resolvedCommands?.[gesture]) await methods.runCommand(...)`. 
- `index.test.ts`:
  - Schema test: `key_macro: "ctrl+c"` alone parses; `key_macro` + `commands.tap` is rejected with a useful error.
  - Behavior test: tapping a `key_macro` button calls `methods.keyMacro` exactly once with the macro string and never calls `runCommand`.
  - Behavior test: hold/dbl-tap with a `key_macro` triggers the corresponding macro for that gesture (we extend the schema to support `key_macro: { tap?, hold?, 'double-tap'? }` — see below).

**Refinement to the schema:** allow `key_macro` to be either a string (applies to all gestures) or an object `{ tap?, hold?, 'double-tap'? }` — same shape as `commands`. This matches user expectations (one button = multiple gestures).

**Verify:** `pnpm --filter sireno-deck-cli test` passes (full suite).

**Done:** Action button can be configured with `key_macro` (string or per-gesture), schema enforces mutual exclusion, and tests prove the wiring.

## must_haves (post-execution verification)

- `parseKeyMacro` exported from `src/index.ts` and reusable from any addon.
- `keyMacroProvider` instantiated per-runtime and per-platform.
- Bundled action button with `key_macro` (string or per-gesture) calls `methods.keyMacro`; without it behaves identically to today.
- Schema refuses a button that sets both `key_macro` and `commands`.
- Provider warns once and no-ops on unsupported platforms (pure Wayland, unknown).
- No new runtime dependencies (no `nut-js`); reuses `execa` for the shell-out providers.
- Test suite green; `oxlint` and `oxfmt` clean.
