---
phase: 03-deck-runtime
plan: 03-03
completed: 2026-06-23
tests_added: 18
tests_total: 155
status: done
---

# 03-03-SUMMARY — Built-in Addons + Full Validation + Integration Test

## What was built

The tracer-bullet plan for Phase 03 — wires the three built-in addons through the registry, defines the `settings` and `session:locked` programmatic decks, extends config validation to per-button `configSchema` + reject internal buttons, and proves the whole pipeline works end-to-end with an integration test.

### Built-in addons

- **`core-buttons`** — `core:action`, `core:change-deck`, `core:toggle`, `core:media-sample`. User-configurable.
- **`internal-settings`** — `core:settings-brightness`, `core:settings-theme`, `core:settings-about`. All `internal: true`. Defines `settings` deck via `createDecks` (3 buttons, no system back reserved).
- **`session`** — `core:session-info` (user-configurable). Defines `session:locked` deck via `createDecks` (5 time buttons). `session:time` is an `internal: true` button.

`registerBuiltins(registry)` registers all three.

### Config validation extension

- `validateFull(config, registry)` runs after `validateBootstrap`:
  - Rejects unknown button types with path
  - Rejects any button where `isSystemButtonType(type) || def.def.internal === true`
  - Parses `button.config` against the addon's `configSchema`; reports first issue's `path: message`
- `isFullValid`, `formatFullIssues` helpers

### Integration test

End-to-end pipe: write fixture YAML → `loadConfig` → `validateFull` → `registerBuiltins` → `createDeckRuntime` → `runtime.dispatchGesture` → asserts nav + command execution.

Also asserts internal button rejection and that `internal-settings.createDecks` returns the settings deck.

## Key files

- `src/builtin-addons/core-buttons/{action,change-deck,toggle,media-sample,index,index.test}.ts` — 4 button types + addon + 4 tests
- `src/builtin-addons/internal-settings/{brightness,theme,about,index,index.test}.ts` — 3 internal buttons + addon + 3 tests
- `src/builtin-addons/session/{session-info,time-button.tsx,locked-deck,index,index.test}.ts` — 1 user + 1 internal button + locked deck + addon + 3 tests
- `src/builtin-addons/{register-builtins,index}.ts` — barrel + registration
- `src/config/validation.ts` — extended with `validateFull`
- `src/config/validation.test.ts` — 5 tests for validateFull
- `src/__tests__/integration.test.ts` — 3 end-to-end tests

## Decisions made

- **Addon types are loose (`config: unknown`)** in `AddonButtonTypeActionContext`. Each built-in button defines its own typed context (`ActionButtonContext`, etc.) and casts in `onTap`. The addon contract stays narrow; consumers cast at the boundary.
- **`AddonRegistry.load` accepts both `ResolvedSirenoAddon` and `SirenoAddon` directly** so built-in registration is ergonomic (no need to wrap with a fake manifest).
- **`internal: true` enforcement** uses `def.def.internal === true` (the addon's flag) rather than only the system-button set. This catches both built-in system buttons and addon-defined internals like `core:settings-brightness`.

## Bugs / adjustments during execution

- `AddonRegistry.load` initially expected `addon.module.name`; built-ins pass the addon object directly. Made `load` accept either shape, normalizing to `ResolvedSirenoAddon`.
- `validateFull`'s `def.def.configSchema` is typed `unknown`; cast to a `{ safeParse }` shape for runtime use.
- Integration test initially destructured `methods` from the button context (which doesn't exist there); rewrote handlers to capture `methods` via closure.
- `createDecks` test for default `timeFormat` was passing empty config and expecting the zod default to apply — but `createDecks` receives raw config (not parsed). Tests now pass `timeFormat` explicitly; defaults are applied by the loader, not createDecks.

## Notes for downstream

- Built-in addons return a `render: () => null` for Phase 03. Phase 04 (WS + frontend) will replace these with real React components that subscribe to channels and render UI.
- `registerBuiltins` is the entry point for the full system. CLI startup calls it before `validateFull` so validation can find all button types.
- Integration test is the canary for regressions in the loader → addon → registry → runtime chain. Keep it green.

## Smoke

- `pnpm exec vitest run` → 155/155 passing
- `pnpm typecheck` → clean
- `pnpm --filter sireno-deck lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 106 files conform
