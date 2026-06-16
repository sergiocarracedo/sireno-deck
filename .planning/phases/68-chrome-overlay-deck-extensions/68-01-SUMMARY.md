# Plan 68-01 Summary

**Completed:** 2026-06-15

## What was built

CHROME-01 delivered. The chrome overlay deck in `config.yml` now exposes 7 keystroke-action buttons (New tab, Close tab, Unclose tab, Incognito, Reload, Hard reload, Dev tools) — each an `action` button with `key_macro: "..."` using the existing primitive. The dead "New tab" placeholder (no `key_macro`, no `commands`) is replaced with a real `key_macro: "ctrl+t"` action. A self-contained fixture at `packages/cli/fixtures/phase-68/config.chrome-overlay-extensions.yml` mirrors the new shape, and a new loader test in `packages/cli/src/config/loader.test.ts` asserts the chrome deck's process_names, button positions, key_macro values, and absence of `commands`/`key_macro` conflicts.

## Key files

- `config.yml` — chrome deck expanded from 1 button (dead placeholder) to 7 buttons at positions 0-6, all real keystroke actions.
- `packages/cli/fixtures/phase-68/config.chrome-overlay-extensions.yml` — new self-contained fixture (theme + main_deck + chrome deck).
- `packages/cli/src/config/loader.test.ts` — new `it()` block "loads the Phase 68 chrome overlay deck fixture with 7 keystroke-action buttons" (89 lines added).

## Decisions made

- **Replaced the dead "New tab" placeholder** (D-05 from CONTEXT). The placeholder had no `key_macro` and no `commands` — `action.tsx:30-39` makes the onTap a no-op in that case. Leaving it would violate CHROME-01's "additional keystroke-action buttons" intent.
- **No new code, no new schema, no new API.** The plan is config + fixture + test only, matching the gap-closure pattern.
- **System back button is runtime-injected at n-1** (Phase 66 wiring). With 7 buttons at positions 0-6, n-1 = 14 on a 15-key deck is free — no collision. The test asserts `Math.max(...positions) < 7` as a guardrail.
- **No fixture test directly imports the fixture file.** The test inlines the YAML content (matching the pattern of every other loader test in `loader.test.ts:36-80`). This keeps the test self-contained and not dependent on fixture file paths (which is a known pitfall per the AGENTS.md regressions section: "Test fixtures must be anchored to stable file-relative paths, not invocation-dependent cwd assumptions").

## Notes for downstream

- **Verification phase 69** should add a real-hardware UAT test for the chrome deck: while Chrome is the foreground app, tap each of the 7 buttons and confirm the corresponding Chrome shortcut fires. The unit test covers the config shape; only real hardware covers keystroke delivery.
- **Phase 70 (verification + metadata backfill)** may want to add a note in REQUIREMENTS.md that the chrome deck's "additional" shortcuts (close tab, reload, hard reload, dev tools) are now part of the chrome overlay. CHROME-01's wording allows this; the explicit list is now in `config.yml`.
- **No regressions** in core-buttons tests (26/26 pass). The 3 pre-existing `loader.test.ts` failures are unrelated (Phase 49's `emoji-entry-button` → `emoji-emoji-button` rename — predates this phase).
- **No new lint warnings** on touched files.

## Commit history (4 atomic commits)

- `c05bfb8` — feat(68-01): expand chrome overlay deck to 7 keystroke-action buttons
- `50f1d67` — feat(68-02): add chrome overlay extensions fixture (phase 68)
- `13f9e38` — test(68-03): loader test for chrome overlay deck shape (7 keystroke buttons)
- (Task 4: targeted test sweep — verification only, no commit)

## Test results

- `loader.test.ts`: 37 passed (3 pre-existing failures from Phase 49 emoji rename, unrelated to Phase 68). New chrome-deck test passes.
- `core-buttons/index.test.ts`: 26/26 pass.
- `oxlint packages/cli/src/config/loader.test.ts packages/cli/fixtures/phase-68/`: 0 warnings.
