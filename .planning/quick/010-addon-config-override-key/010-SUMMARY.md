# Quick Task 010 Summary

**Task:** `addons[i].config.decks.<deckId>` overrides were silently dropped.
User set `autoShow: false` for vscode-overlay's `shortcuts` deck; chrome-overlay's
`shortcuts` was the actual focus of the bug report, but the same override mechanism
controls all addon decks. Result: overrides were never applied.
**Completed:** 2026-07-22
**Code commit:** `bc52f719`

## Root cause

`buildRuntime` (in `packages/cli/src/cli/commands/run.ts`) stored addon
overrides keyed by `entry.source` (the path/spec the user wrote in
`addons[i].src`). `materializeAddonDecks` looked them up by `addon.name`
(the manifest name). Two distinct keys for the same data, so the lookup
returned `undefined` and the override never reached the addon deck.

A second smaller bug in the same block: the original code read
`entry.source` on raw addon entries, which actually have `.src`. So the
override was stored under key `undefined` and never matched anything —
the override machinery has been silently broken since it was added.

## What was done

1. **`loadExternalAddonsIntoRegistry` returns a spec→name map.**
   Specifier (what the user wrote, after `loadAddons` returns it) maps to
   the loaded manifest name. Successfully-registered addons only.

2. **`buildAddonConfigOverrides` (new exported helper)** reads the
   spec→name map and keys the override map by manifest name. Accepts
   string-form addon entries (`- /path/to/addon`) and object form
   (`- src: /path/to/addon, config: ...`). Warns and drops the override
   when the addon didn't load (path typo, missing module).

3. **`buildRuntime`** delegates to the helper. The override is now keyed
   by `addon.name` — what `materializeAddonDecks` looks up — so per-deck
   overrides (`autoShow`, `name`, `icon`, `trigger`, custom `config`)
   actually flow through to the addon deck.

## Verification

- 5 new unit tests in `build-addon-config-overrides.test.ts` cover:
  the user's exact bug (path key → manifest name key), cross-addon
  suffix collision (vscode-overlay and chrome-overlay both have a
  `shortcuts` deck; each gets its own override entry), addonWideConfig
  passthrough, the warn-and-drop path for failed loads, and string-form
  addon entries.
- `pnpm exec vitest run packages/cli/src/cli/commands/__tests__/build-addon-config-overrides.test.ts`
  → 5/5 pass.
- `pnpm exec vitest run packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`
  → 23/24 pass (1 pre-existing failure unrelated).
- `pnpm -C packages/cli typecheck` → no new errors in changed files.

## Files changed

- `packages/cli/src/cli/commands/run.ts`
  - `loadExternalAddonsIntoRegistry` now returns `Map<spec, name>`.
  - `LoadConfigResult` carries `addonSpecToName`.
  - `buildAddonConfigOverrides` (exported) handles the keying logic.
  - `buildRuntime` delegates to the helper.
- `packages/cli/src/cli/commands/__tests__/build-addon-config-overrides.test.ts` (new)

## Commit

`bc52f719` fix(run): key addon config overrides by manifest name, not src path

## Notes

- The chrome-overlay `shortcuts` deck still hardcodes `autoShow: true` in
  its manifest. After this fix, the user can disable it with a
  parallel override (drop in `addons:` list for chrome-overlay too).
- `addonWideConfig` (custom opaque keys like `config.extra: true`) was
  doubly broken: keyed by `entry.source` (undefined) AND not propagated
  through `collectAddonDefaultButtonConfig` (keyed by `addon.name`). The
  new helper fixes the keying; the addon author still has to read these
  keys from `createDecks({config})` themselves.
- The `unused-vars` warning in the unused original `addonConfigOverrides`
  type was removed alongside the refactor.