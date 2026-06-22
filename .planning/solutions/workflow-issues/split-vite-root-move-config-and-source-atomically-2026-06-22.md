---
title: "Splitting a Vite root into two: move config + source atomically, never split the move"
date: 2026-06-22
category: workflow-issues
module: packages/cli/frontend + packages/cli/frontend-emulator
problem_type: workflow_issue
severity: medium
tags:
  - vite
  - code-move
  - atomic-commit
  - half-done-refactor
  - 404-on-source
applies_when:
  - Splitting one Vite-served project into two roots (or any code move that creates new project root)
  - When the move is split across multiple commits
  - When "config files first, source later" feels safe but creates a window where the new root references nonexistent files
---

# Splitting a Vite root into two: move config + source atomically

## Context

Phase 75.1-04 decided to split one Vite-served project (`packages/cli/frontend/` serving both deck and emulator) into two roots:

- `packages/cli/frontend/` (deck)
- `packages/cli/frontend-emulator/` (emulator shell, with the deck rendered inside an iframe)

The split was done in commit `2a4c608 refactor(75.1-04): split emulator into separate Vite server`. That commit **moved the config files only**:

- `packages/cli/frontend-emulator/index.html` (new)
- `packages/cli/frontend-emulator/vite.config.ts` (new)
- `packages/cli/frontend-emulator/vite-dev-entry.ts` (new)

…and **deleted** the old `packages/cli/frontend/emulator.html`. But the actual React source files that `index.html` referenced (`/src/main-emulator.tsx`, `EmulatorShell.tsx`, `IframeCanvas.tsx`, `DeviceSelector.tsx`, `mouse-to-button.ts`, `devices.ts`) **stayed in `packages/cli/frontend/src/`**.

Result: emulator Vite served fine, but every JS file the index.html referenced 404'd. `GET /src/main-emulator.tsx net::ERR_ABORTED 404`.

## Why this happened

The split felt "safe" because the config files can exist without source — no syntax errors, no broken imports. The risk felt low. But the user opens the emulator URL during the same session, sees the 404, and you have to file a follow-up "Plan 75.1-05" purely to fix the move.

The mental model: "I'll move config first to validate the new root compiles, then move source in a follow-up." This is wrong. The config has NO meaningful validation without source. It just sits there looking fine until something tries to load it.

## Guidance

**Rule: when moving a Vite root, config + source + HTML entry point move atomically in one commit.**

Concretely:

1. `git mv` all source files (`src/...`) from old root to new root.
2. `git mv` all config files (`vite.config.ts`, `vite-dev-entry.ts`, `index.html`) from old root to new root.
3. Fix imports inside the moved source (relative paths change when the source moves).
4. Fix `@/` alias direction in the new `vite.config.ts` (the new root may need a different alias target).
5. **Verify end-to-end** before committing: spin up the new root and open the entry HTML in a browser, confirm 200 on every referenced JS file.
6. Commit. ONE commit.

If the move is genuinely too large for one commit (rare — multi-thousand-line diff), split **along dependency boundaries**, not config-vs-source:

- First commit: shared types + protocol + ws-client (no Vite root touched).
- Second commit: new root config + source together.
- Third commit: CLI wiring update to use new root.

But NEVER "config in commit N, source in commit N+1" for the same Vite root. That's the trap.

## When this bit us (Phase 75.1-05 fixup details)

The fixup commit `f66d2e8 fixup(75.1-05): move emulator sources to frontend-emulator root + inject URLs via env` did six `git mv`s + import fixes + one Vite plugin + one CLI wiring change in a single commit. That commit was clean. The half-done move in `2a4c608` was the bug.

User feedback when the 404 surfaced: "the emulator server should know the frontent and ws urls without pass them via url. I also got this error in the emulator page: GET http://127.0.0.1:8912/src/main-emulator.tsx net::ERR_ABORTED 404 (Not Found)".

That single message triggered the entire Plan 75.1-05 — a whole new plan because of a half-done move.

## Related

- `.planning/solutions/best-practices/env-injection-via-vite-transformindexhtml-2026-06-22.md` — the OTHER 75.1-05 fix (URL injection via env instead of query string) that lived in the same atomic commit
- `.planning/solutions/best-practices/deck-list-broadcast-without-request-2026-06-22.md` — Phase 75.1-06 protocol design
- `.planning/quick/016-fix-ship-blockers-from-full-branch-test` — same class of half-done-merge bug, different symptom
