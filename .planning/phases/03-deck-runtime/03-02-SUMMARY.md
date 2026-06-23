---
phase: 03-deck-runtime
plan: 03-02
completed: 2026-06-23
tests_added: 30
tests_total: 137
status: done
---

# 03-02-SUMMARY — Action Executor + Deck Runtime

## What was built

The orchestration layer between core primitives (Plan 01) and built-in addons (Plan 03):

1. **util/errors.ts** — `NotImplementedError` (for Phase 07 OS providers) + `ConfigError`.
2. **deck/host-context.ts** — `getHostContext()` returns `{ hostname, platform, userInfo, arch }` via Node `os` module.
3. **action/executor.ts** — `createActionExecutor({ host })` returns `{ run(command, opts) }`. Uses `execa('/bin/sh', ['-c', ...])` with `{{ host.* }}` placeholder interpolation (throws `ActionError` for unknown keys).
4. **deck/system-buttons/types.ts** — `SYSTEM_BUTTON_TYPES` const + `SystemButtonType` union + `isSystemButtonType()` guard.
5. **deck/system-back-injection.ts** — `computeSystemButtonForSlotN1(deck, state)` returns the system button type for slot n-1 (or null). Logic: main → settings-entry; overlay → overlay-toggle; depth>1 → back.
6. **deck/methods.ts** — `Methods` interface + `createMethods(ctx)`: `runCommand`, `keyMacro` (throws NotImplementedError), `pasteText` (throws), `navigateToDeck`, `goBack`, `getActiveDeckId`, `invalidate`, `publish`, `subscribe`.
7. **deck/runtime.ts** — `Runtime` interface + `createRuntime({ decks, pubSub, store, logger })`. Nav stack + transient deck for `addToHistory:false` semantics. `dispatchGesture` calls registered handler for `tap|dbl-tap|hold`.
8. **deck/index.ts** — barrel + `createDeckRuntime({ decks, logger? })` convenience that wires pub-sub + store + runtime + executor + methods.
9. **action/index.ts** — barrel for action module.

## Key files

- `packages/cli/src/action/executor.ts` (~80 lines)
- `packages/cli/src/action/index.ts` (barrel)
- `packages/cli/src/action/executor.test.ts` (7 tests)
- `packages/cli/src/deck/host-context.ts` (15 lines)
- `packages/cli/src/deck/system-buttons/types.ts` (10 lines)
- `packages/cli/src/deck/system-back-injection.ts` (~30 lines)
- `packages/cli/src/deck/system-back-injection.test.ts` (6 tests)
- `packages/cli/src/deck/methods.ts` (~60 lines)
- `packages/cli/src/deck/methods.test.ts` (6 tests)
- `packages/cli/src/deck/runtime.ts` (~140 lines)
- `packages/cli/src/deck/runtime.test.ts` (11 tests)
- `packages/cli/src/deck/index.ts` (~50 lines, barrel + createDeckRuntime)
- `packages/cli/src/util/errors.ts` (NotImplementedError, ConfigError)

## Decisions made

- **`addToHistory: false` semantics**: when navigating without history, the new deck is "transient" — `navStack` doesn't grow but `transientDeckId` is set. `getActiveDeckId` returns transient first, nav-stack top otherwise. `goBack` clears transient first (restoring nav-stack top), then pops the stack.
- **Action executor**: explicit interpolation via regex `\{\{\s*host\.(\w+)\s*\}\}`. Unknown keys collected into a set and thrown together so multiple typos surface in one error.
- **`keyMacro` / `pasteText`**: both throw `NotImplementedError` explicitly so Phase 07 can grep for them and find their call sites.

## Bugs / adjustments during execution

- `execa` 9.x strips trailing newlines from stdout/stderr. Tests use `.trim()` for comparison.
- `runtime.invalidate()` referenced removed `activeDeckId` after refactor; replaced with `getActiveDeckId()`.
- Lint flagged unused re-imports in `deck/index.ts`; cleaned up by removing redundant imports next to `export {}` re-exports.

## Notes for downstream

- Plan 03 (built-in addons) wires `core:action` and `core:change-deck` to call these methods. The runtime's `registerButtonHandler` is the extension point for addons.
- `dispatchGesture` is async; callers should `await` it. If a handler throws, the rejection propagates.
- `setOverlay(null)` clears overlay; overlay deck identity is tracked separately from nav stack.
- `pubSub.publish('runtime:activeDeck', ...)` fires on every nav change; `pubSub.publish('runtime:overlay', ...)` on overlay change; `pubSub.publish('runtime:invalidate', ...)` on invalidate. Frontend (Phase 04) subscribes to these.

## Smoke

- `pnpm exec vitest run` → 137/137 passing
- `pnpm typecheck` → clean
- `pnpm --filter sireno-deck-2 lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 85 files conform
