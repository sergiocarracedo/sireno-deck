# State

> Where the repo is right now.

## Branch

`refactor/architecture-doc` @ `38dc601b` — "feat(addon): gestureHandlers opt-in filter with default-deny (P2)"

## What just landed

- **Commit `38dc601b`** P2 shipped — `gestureHandlers` opt-in with default-deny. `AddonButtonTypeBackend.gestureHandlers?: readonly GestureKind[]` enforced at invoke time in `addon-handler-bridge.ts`. Registry warns at load. Frontend filters in `Deck.tsx`. Vite plugin exposes to `addonRegistry`. Audit: 9 button types across 6 addons annotated.
- **Commit `a1b62bd3`** P1 shipped — React Router + BrowserRouter, service-driven nav. 2 vitest cases added. P1 docs (STATE/ROADMAP) updated.
- **Commit `e4fd7b7c`** replaced `.planning/` (158 files) with a single `ARCHITECTURE.md` at the repo root.
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

P2 (gestureHandlers default-deny) shipped at `38dc601b`. Next item per ROADMAP.md: **P4 — Auto-register addon decks on load**.

## Pre-existing known issues (do NOT touch without forensics)

- **79 failures in `packages/cli/src/deck/runtime.test.ts`** — Phase 42/67 system-back-injection firing in test contexts. Pre-dates Phase 71. Flagged for future forensics.
- **Frontend-UI clicks bypass the gesture stream** — known small issue in `ARCHITECTURE.md §9`. Frontend `sendButtonAction` calls `runtime.invokeAction` directly. Fix on demand.

## Recently shipped (for context, not for editing)

- **P2 — gestureHandlers default-deny** (`38dc601b`) — api.ts + registry.ts + addon-handler-bridge.ts + virtual-modules.ts + Deck.tsx. 9 builtins audited. 9/9 + 13/13 tests pass. 0 lint errors.
- **P1 — React Router in frontend** (`74d9dc59`) — service-driven nav, BrowserRouter, URL projection. 2 vitest cases added.
- **Phase 75-01** — `value-display` first-party addon (1-3 values cap, parallel `Promise.all` polling). 8/8 tests pass.
- **Phase 74-01** — `system-status-label-values` metrics capped at 1-2; 3+ rejected with hint to use `value-display`. 7/7 tests pass.
- **Phase 73-01/02** — pasteText now writes to clipboard AND sends Ctrl+V/Cmd+V; key-macro providers throw on failure (caught + shown as runtime button error). 4/4 + 19/19 tests pass.
- **Phase 72-01/02/03** — icon fallback chain for `OverlayToggleButton` and SplitActionSurface; gap-closure docs. 6/6 + 14/14 tests pass. (1 deferred test — visual fix only.)
- **Phase 71-01/02** — `dispatchGestureEnd` refactor + system back button fix. 6/6 gesture-state tests pass; runtime.test.ts baseline unchanged.