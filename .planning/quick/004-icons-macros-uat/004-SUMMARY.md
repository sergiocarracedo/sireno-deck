# Quick Task 004 Summary

**Task:** UAT bugs from real-hardware testing of Phase 10 — icons disappear on app change, vscode overlay doesn't use vscode icon, chrome overlay no icons in buttons, type:// macros
**Completed:** 2026-07-21

## What was done

Three small fixes addressed all four reported UAT symptoms:

1. **`core:action` missing `gestureHandlers: ['tap']`** — `packages/cli/src/builtin-addons/core/index.ts`. The addon registry's default-deny policy was stripping `tap` from `core:action` buttons, so `type://` macros and addon-deck `actions.tap` silently no-op'd. Now matches the pattern used by `core:change-deck`, `core:toggle`, `core:page-nav`. The README at `packages/cli/src/builtin-addons/core/README.md:21` already documented that `actions.tap` was the intended API, so this was an oversight, not a design change.

2. **`deriveLabel` falls back to `config.label`** — `packages/cli/src/deck/deck-config.ts`. The original implementation only read `config.command`, so chrome-overlay buttons (which use `config.label: 'New Tab'`) rendered with no label. Added a fallback that returns `config.label` when `config.command` is missing. Added 4 unit tests in `deck-config-derive-label.test.ts` covering command (legacy), label (new), long-input truncation, and the empty case.

3. **External addon dirs registered in `addonDirs`** — `packages/cli/src/cli/commands/run.ts` + `packages/cli/src/deck/deck-config.ts`. `buildResolverOptions` previously built `addonDirs` only from builtin addons. External addons from `config.yml` (vscode-overlay, opencode-overlay, chrome-overlay) are now registered too, so `addon://<name>/assets/icon.png` resolves to the right directory. Tilde expansion (`~/...`) and config-relative paths both work.

## Files changed

- `packages/cli/src/builtin-addons/core/index.ts` — added `gestureHandlers: ['tap']` to `core:action`
- `packages/cli/src/deck/deck-config.ts` — `deriveLabel` falls back to `config.label`; `buildResolverOptions` accepts optional `extraAddonDirs`
- `packages/cli/src/cli/commands/run.ts` — builds `externalAddonDirs` from `loaded.config.addons` (with tilde expansion) and passes them to `buildResolverOptions`
- `packages/cli/src/deck/__tests__/deck-config-derive-label.test.ts` — new tests for deriveLabel

## Commits

- `b2332ece` fix(quick-004): declare gestureHandlers on core:action so taps fire
- `a97a348e` fix(quick-004): deriveLabel falls back to config.label for core:action
- `ab368558` fix(quick-004): register external addon dirs for icon resolution

## Symptom → Fix mapping

| Reported symptom | Root cause | Fix commit |
|------------------|-----------|------------|
| "type:// macros don't work" | `core:action` missing `gestureHandlers: ['tap']` | `b2332ece` |
| "Chrome overlay no icons in buttons" (labels) | `deriveLabel` only checked `config.command` | `a97a348e` |
| "VSCode overlay doesn't use vscode icon" | `addon://vscode-overlay/...` failed to resolve | `ab368558` |
| "Some icons disappear on active app change" | chrome-overlay deck icon (`addon://chrome-overlay/...`) failed to resolve → deck appeared blank when activated | `ab368558` |

## Notes for downstream

- Pre-existing test failures (weather frontend, emoji selector, run.test mock) are unchanged. Quick task didn't introduce or fix those.
- Real-hardware UAT should re-verify: chrome-overlay buttons now show icon + label, vscode-overlay deck shows the vscode icon, `type://ctrl+t` and similar macros actually fire.
- If future external addons have icon paths in a different scheme (e.g. `addon-cdn://`), the addonDirs map can be extended to cover those — current fix only handles `addon://<name>/<path>`.