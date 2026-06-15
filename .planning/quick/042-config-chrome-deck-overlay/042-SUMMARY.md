# Quick Task 042 Summary

**Task:** Modify config.yml so the chrome deck renders when chrome is the active window.
**Completed:** 2026-06-09

## What was done

Added `process_names: ['chrome']` to the `chrome` deck in `config.yml`.
The Phase 55 active-app monitor (already wired in `start.ts`) will now
match the chrome deck against the foreground process on any platform:

- `google-chrome` (Linux binary)
- `Google Chrome` (macOS, with auto `.app` suffix)
- `chrome.exe` (Windows, with auto `.exe` suffix)

`chrome` is a case-insensitive substring (per Phase 55-01 plan / `processNamesMatch`
helper at `runtime.ts:154-170`).

## Verification

- `js-yaml.load(config.yml)` → `chrome.process_names: ['chrome']` ✓
- `pnpm --filter sireno-deck-cli exec vitest run --reporter=basic src/core` → 19/19 passed (including the 3 `process_names` schema tests) ✓
- `loadConfigWithSources('config.yml')` round-trip → loaded chrome deck has `process_names: ['chrome']` preserved ✓
- `tsc --noEmit` has pre-existing errors in unrelated dirty/merge-conflicted files (`reconciler.ts`, `theme-utilities.ts`, `key-macro/darwin.ts`, `IconLabelSurface.tsx`, etc.). None were touched by this edit; not in scope to fix.

## Out of scope / left for the user

- The chrome deck only has one button (position 0, "New tab"). Most of the 15
  buttons on a standard Stream Deck will be empty when the overlay appears.
  Adding more buttons to the chrome deck is a separate change.
- The rest of the working tree is heavily contaminated with merge conflicts
  in `.planning/STATE.md`, an unrelated untracked `Phase 17` directory, and
  dozens of dirty/merge-conflicted files. This quick commit does not touch
  any of them.
- Whether the active-app monitor actually detects foreground processes on
  this machine needs a manual UAT pass. The runtime wiring is in place
  (`start.ts:911-924`); the monitor logs a support message at boot.

## Files changed

- `config.yml`: added `process_names: ['chrome']` to the `chrome` deck
  (between `id: chrome` and `buttons:`).

## Commit

0e4ffda
