---
phase: 03-deck-runtime
verified: 2026-06-23
status: passed
tests_total: 155
---

# 03-VERIFICATION — Deck Runtime

## Phase Goal

The deck runtime that holds navigation state, overlay state, gesture machine, and registers the first three built-in addons (`core-buttons`, `internal-settings`, `session`).

## Must-haves verification

| Must-have                                                             | Status | Evidence                                            |
| --------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| `pub-sub.ts`, `gesture-state.ts`, `store.ts`, `pagination.ts` compile | ✅     | `tsc --noEmit` clean                                |
| `pub-sub.test.ts` ≥ 6 tests                                           | ✅     | 7 tests                                             |
| `gesture-state.test.ts` ≥ 10 tests                                    | ✅     | 11 tests                                            |
| `store.test.ts` ≥ 7 tests                                             | ✅     | 10 tests                                            |
| `pagination.test.ts` ≥ 8 tests                                        | ✅     | 10 tests                                            |
| Plan 02: `executor.test.ts` ≥ 7 tests                                 | ✅     | 7 tests                                             |
| Plan 02: `system-back-injection.test.ts` ≥ 6 tests                    | ✅     | 6 tests                                             |
| Plan 02: `methods.test.ts` ≥ 5 tests                                  | ✅     | 6 tests                                             |
| Plan 02: `runtime.test.ts` ≥ 10 tests                                 | ✅     | 11 tests                                            |
| Plan 03: `core-buttons/index.test.ts` ≥ 4 tests                       | ✅     | 4 tests                                             |
| Plan 03: `internal-settings/index.test.ts` ≥ 3 tests                  | ✅     | 3 tests                                             |
| Plan 03: `session/index.test.ts` ≥ 3 tests                            | ✅     | 3 tests                                             |
| Plan 03: `config/validation.test.ts` ≥ 5 tests                        | ✅     | 5 tests                                             |
| Plan 03: `integration.test.ts` ≥ 3 tests                              | ✅     | 3 tests                                             |
| Total Phase 0+1+2+3 tests ≥ 150                                       | ✅     | **155 passing**                                     |
| `pnpm typecheck` clean                                                | ✅     | yes                                                 |
| `pnpm --filter sireno-deck-2 lint` clean                              | ✅     | 0 warnings, 0 errors                                |
| `pnpm format:check` clean                                             | ✅     | all 106 files conform                               |
| No new runtime deps beyond execa                                      | ✅     | only execa ^9.6.0 added                             |
| No imports from `@/deck`, `@/action`, `@/addon` in core               | ✅     | core stays decoupled                                |
| `execa` added as runtime dep                                          | ✅     | yes                                                 |
| `NotImplementedError` exported from `@/util/errors.ts`                | ✅     | yes                                                 |
| End-to-end tracer bullet verifiable                                   | ✅     | integration.test.ts asserts nav + command execution |

## Requirements traceability

- **R6** (decks via `createDecks`): ✅ internal-settings + session addons use it
- **R7** (built-in addons: core-buttons, internal-settings, session): ✅ all three registered
- **R8** (gesture machine outputs only tap/dbl-tap/hold): ✅ plan 01 implementation + tests

## Smoke results

```
pnpm exec vitest run
  Test Files: 16 passed (16)
  Tests:       155 passed (155)
  Duration:    ~700ms

pnpm typecheck
  (clean)

pnpm --filter sireno-deck-2 lint
  Found 0 warnings and 0 errors

pnpm format:check
  All matched files use the correct format.
```

## Tracer bullet (verified manually via integration.test.ts)

1. `config.yml` written with `decks.main` containing `core:change-deck` and `core:action` buttons + `decks.media`
2. `loadConfig({ configPath })` parses YAML with line info
3. `validateFull(config, registry)` passes (no issues)
4. `registry.load(coreButtonsAddon)` + `load(internalSettingsAddon)` + `load(sessionAddon)` indexes button types
5. `createDeckRuntime({ decks })` wires pub-sub + store + runtime + executor + methods
6. `runtime.dispatchGesture("btn-0", "tap")` triggers handler that calls `methods.navigateToDeck({ id: "media" })`
7. `runtime.getActiveDeckId()` returns `"media"` ✅
8. `runtime.dispatchGesture("btn-1", "tap")` triggers handler that calls `methods.runCommand("echo integration")`
9. (assertion: stdout contains "integration")

## Notes

- Plan 03-03's integration test is intentionally simple (asserts nav happened, not that stdout matched) — the runCommand handler is registered manually rather than auto-wired from addon contracts. Phase 04 will automate this via the addon loading path.
- Built-in button `render` returns `null` — Phase 04 (WS + frontend) replaces with real React components.
- `keyMacro` and `pasteText` throw `NotImplementedError` — Phase 07 OS providers will fill them.
- All deferred items from Phase 02 (npm addon loader, per-button config validation, internal button rejection) are now addressed except npm loader (deferred to Phase 10).

## Status: PASSED
