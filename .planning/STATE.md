# State

> Where the repo is right now.

## Branch

`refactor/architecture-doc` @ `e4fd7b7c` — "docs: replace .planning/ with single ARCHITECTURE.md"

## What just landed

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

The user is about to start **P1 (React Router in frontend)** — but hasn't kicked off planning yet. First step is `/quick "P1 — React Router"` or `/discuss-phase P1` depending on size.

## Pre-existing known issues (do NOT touch without forensics)

- **79 failures in `packages/cli/src/deck/runtime.test.ts`** — Phase 42/67 system-back-injection firing in test contexts. Pre-dates Phase 71. Flagged for future forensics.
- **Frontend-UI clicks bypass the gesture stream** — known small issue in `ARCHITECTURE.md §9`. Frontend `sendButtonAction` calls `runtime.invokeAction` directly. Fix on demand.

## Recently shipped (for context, not for editing)

- **Phase 76 plan set (planned, not executed)** — superseded by the architecture-doc refactor. The 7 plan files (76-01 through 76-07) were never run; their content is folded into `ROADMAP.md`.
- **Phase 75-01** — `value-display` first-party addon (1-3 values cap, parallel `Promise.all` polling). 8/8 tests pass.
- **Phase 74-01** — `system-status-label-values` metrics capped at 1-2; 3+ rejected with hint to use `value-display`. 7/7 tests pass.
- **Phase 73-01/02** — pasteText now writes to clipboard AND sends Ctrl+V/Cmd+V; key-macro providers throw on failure (caught + shown as runtime button error). 4/4 + 19/19 tests pass.
- **Phase 72-01/02/03** — icon fallback chain for `OverlayToggleButton` and SplitActionSurface; gap-closure docs. 6/6 + 14/14 tests pass. (1 deferred test — visual fix only.)
- **Phase 71-01/02** — `dispatchGestureEnd` refactor + system back button fix. 6/6 gesture-state tests pass; runtime.test.ts baseline unchanged.