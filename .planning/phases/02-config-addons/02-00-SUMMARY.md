---
phase: 02-config-addons
plan: 02
completed: 2026-06-23
tests_added: 61
tests_total: 69
status: done
---

# 02-SUMMARY — Config + Addon Loader

## What was built

Full config pipeline (zod-validated YAML → `@file.yml` expansion → bootstrap validation) with line-number-aware errors. 4-scheme icon resolver (relative path, `icon://`, `builtin://`, `addon://`) backed by 45 CLI-builtin icon ids. Addon loader that handles local folders via dynamic import (npm deferred with explicit error to be implemented in Phase 10). Addon registry indexes by name + button type + deck type. Hot-reload watcher wraps chokidar v5.

## Files changed

See `02-PHASE.md` for full list.

## Tests

- 38 config tests + 23 addon tests = 61 new tests added (total 69/69 passing)
- Coverage: icon resolver all 4 schemes, addon entry normalization, manifest reader, dynamic import path, registry indexes + duplicates, YAML line info, bootstrap validation (missing main + duplicate positions)

## Smoke

- `pnpm typecheck` clean
- `pnpm exec vitest run` 69/69 passing
- `pnpm --filter sireno-deck lint` clean
- `pnpm format:check` clean

## Bugs / adjustments

- `addon/loader.ts` imported non-existent `isLocalIconPath` → switched to `isLocalAddonSpec`
- `reference-expander.ts` missing `dirname` import
- All zod schemas needed `.strict()` to reject unknown keys
- Loader `validateModule` unwraps `moduleValue.default ?? moduleValue`
- `isLocalAddonSpec` needs early `@` check (not `@/` or `@\`) for npm scope detection
- Test needed `mkdirSync` before writing XDG config

## Next

Phase 03 — deck-runtime. See `03-PHASE.md` and `03-CONTEXT.md`.
