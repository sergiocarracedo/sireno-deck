# State

> Where the repo is right now.

## Branch

`refactor/architecture-doc` @ HEAD — v1.7 P-list shipped (P1-P8)

## What just landed

- **P8 — Backend→Service rename** — all types/fields/imports renamed. 60+ files.
- **OutputClient unification** — `runRealModePipeline` + `runEmulatorLifecycle` collapsed into a single `runPipeline` that uses `selectOutputClient({emulator, device, intervalMs?})`. New `packages/cli/src/cli/commands/output-client/{types,real,emulator,index}.ts`. `emulator-mode.ts` slimmed to helpers only (`buildDeckConfigMessage`, `spawnFrontendVite`, `spawnEmulatorVite`, `killChild`, `resolveFrontendCwd`, `resolveEmulatorCwd`, `findWorkspaceRoot`, `AddonFrontendRef`). `real-mode.ts` deleted. Emulator mode now starts system providers too (latent gap closed).
- 284 unrelated dirty files left in the working tree (pre-existing in-progress work from `feat/human-changes` merge `74b342fd`). **Don't touch them** unless explicitly asked.

## What just landed (this commit)

- `.planning/research/{STACK,FEATURES,PITFALLS,SUMMARY}.md` — lean mirrors of the architecture doc.
- `.planning/research/ARCHITECTURE.md` — copy of the root doc so this dir is self-contained.
- `.planning/PROJECT.md` — project description, scope guardrails, success criteria.
- `.planning/ROADMAP.md` — v1.7 P-list with audit items + open questions.
- `.planning/STATE.md` — this file.
- `.planning/DECISIONS.md` — locked decisions from the architecture-doc Q&A.
- `.planning/AGENTS.md` — lean learnship-aware workflow rules.
- `.planning/solutions/` — empty skeleton for `/compound` outputs.

## Working tree

```
$ git status --short | wc -l
284 (untouched, pre-existing)
```

## Next

v1.7 complete. Next: user decides v1.8 scope.

## Milestone History

### v1.7 — Polish & 3rd-Party Fixtures

Completed: 2026-07-08
P-items: P1 (React Router), P2 (gestureHandlers), P4 (default main deck + n-1 injection), P5 (internal? flag), P6 (SplitActionSurface), P8 (Backend→Service rename)
Key achievements: All v1.7 P-items shipped and verified. Milestone audit passed. Zero new stubs or integration gaps.

## Pre-existing known issues (do NOT touch without forensics)

- **79 failures in `packages/cli/src/deck/runtime.test.ts`** — Phase 42/67 system-back-injection firing in test contexts. Pre-dates Phase 71. Flagged for future forensics.
- **Frontend-UI clicks bypass the gesture stream** — known small issue in `ARCHITECTURE.md §9`. Frontend `sendButtonAction` calls `runtime.invokeAction` directly. Fix on demand.

## Recently shipped (for context, not for editing)

- **P8 — Backend→Service rename** — all types/fields/imports. 60+ files. 28/28 tests pass.
- **P6 — SplitActionSurface on n-1** — already delivered by P4 (computeSystemButtonForSlotN1).
- **P5 — internal? on AddonDeckDefinition** — registry skips internal decks. 88/88 tests pass.
- **P4 — default main deck, n-1 injection, addon auto-register** — 3 commits. 69/69 tests pass.
- **P2 — gestureHandlers default-deny** (`38dc601b`) — api.ts + registry.ts + addon-handler-bridge.ts + virtual-modules.ts + Deck.tsx. 9 builtins audited. 9/9 + 13/13 tests pass. 0 lint errors.
- **P1 — React Router in frontend** (`74d9dc59`) — service-driven nav, BrowserRouter, URL projection. 2 vitest cases added.
- **Phase 75-01** — `value-display` first-party addon (1-3 values cap, parallel `Promise.all` polling). 8/8 tests pass.
- **Phase 74-01** — `system-status-label-values` metrics capped at 1-2; 3+ rejected with hint to use `value-display`. 7/7 tests pass.
- **Phase 73-01/02** — pasteText now writes to clipboard AND sends Ctrl+V/Cmd+V; key-macro providers throw on failure (caught + shown as runtime button error). 4/4 + 19/19 tests pass.
- **Phase 72-01/02/03** — icon fallback chain for `OverlayToggleButton` and SplitActionSurface; gap-closure docs. 6/6 + 14/14 tests pass. (1 deferred test — visual fix only.)
- **Phase 71-01/02** — `dispatchGestureEnd` refactor + system back button fix. 6/6 gesture-state tests pass; runtime.test.ts baseline unchanged.
