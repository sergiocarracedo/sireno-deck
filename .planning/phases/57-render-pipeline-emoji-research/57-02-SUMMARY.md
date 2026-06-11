# Plan 57-02 Summary

**Completed:** 2026-06-11

## What was built

Two documentation sections added to `57-RESEARCH.md`:

- **RES-02 pasteText Design** — wrapper shape, platform paste key map, Wayland fallback, opt-out config, Phase 59 test plan, migration impact.
- **RES-03 Category Audit** — `comm -12` audit result, per-category char counts, user perception hypothesis, conclusion.

## Key files

- `.planning/phases/57-render-pipeline-emoji-research/57-RESEARCH.md` — RES-02 and RES-03 sections appended

## Decisions made

- **Wrapper goes in runtime, not `clipboard.ts`** — runtime owns `keyMacroProvider` and `hostContext`. Keeping `clipboard.ts` pure (one dep, `clipboardy`) preserves testability and avoids circular imports.
- **Opt-out via `paste.keystroke: false`** in config.yml — restores X11/Wayland-safe default for users who don't want simulated keystrokes. Defaults to `true` so users get the new behavior out of the box.
- **RES-03 marked resolved** — data is clean (zero overlap, 383 unique chars). User perception of "duplication" is most likely visual confusion from the launcher grid showing the same `😂` regardless of active category. Defer UX feedback to backlog, not Phase 59.

## Notes for downstream

- **Phase 59 (EMO-15)** should use the Option A wrapper shape from RES-02.
- **Phase 59 (EMO-17)** — RES-03 is resolved; no category data fix needed. The user's perception is a UX issue, not a data issue. If the user provides a specific emoji they expected to be in only one category, re-audit that char.
- The Wayland `unsupported` adapter returns immediately without error. Phase 59 should NOT add error handling that surfaces the no-op as a user-visible failure — `runtimeLogger.warn` is sufficient.

## Commits

- `4aa0595` research(57-02): add RES-02 pasteText design and RES-03 category audit sections
