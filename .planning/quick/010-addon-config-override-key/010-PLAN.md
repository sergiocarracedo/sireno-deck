# Quick Task 010 Plan: Fix per-deck addon overrides not applied

## Root cause

`run.ts:606` builds `addonConfigOverrides` keyed by `entry.source` (the path
the user wrote in `addons[i].src`, e.g. `/works/opensource/sireno-deck-addons/vscode-overlay`).

`addon-decks.ts:236` looks up the same map by `addon.name` (the manifest name,
e.g. `vscode-overlay`).

The two keys don't match, so the per-deck overrides (`autoShow: false`, custom
`config.extra`, etc.) are silently dropped on the floor — the addon deck keeps
its hardcoded defaults.

In the user's config:
```yaml
addons:
  - src: /works/opensource/sireno-deck-addons/vscode-overlay
    config:
      decks:
        shortcuts:
          autoShow: false
          config:
            extra: true
```

`vscode-overlay:shortcuts` keeps `autoShow: true` (from the addon's manifest).
The override is never read because `addonConfigOverrides.get("vscode-overlay")`
returns `undefined`.

Unit tests at `addon-decks.test.ts:651-739` exercise `materializeAddonDecks`
directly with `["test-addon", {...}]` keyed by manifest name, so they pass —
the bug only surfaces when the overrides flow through `buildRuntime` from
`run.ts`.

## Fix

Make `addonConfigOverrides` key by `addon.name` (manifest name), the same way
`materializeAddonDecks` reads it. To do that we need to resolve
`entry.source` (path) → `addon.name` after loading.

Change `loadExternalAddonsIntoRegistry` to return a `Map<source, name>` for
successfully loaded addons. Use it in `buildRuntime` to build the override map
keyed by manifest name. If an `entry.source` has no matching loaded addon
(load failed), warn and drop the override.

## Task 1: re-key overrides by addon manifest name

### Files
- `packages/cli/src/cli/commands/run.ts`

### Action
- `loadExternalAddonsIntoRegistry` returns a `Map<string, string>` (specifier
  → manifest name) for addons that loaded successfully.
- `buildRuntime` looks up `entry.source` in that map and stores the override
  under the manifest name.
- Add a warn log when an override targets an addon that didn't load.

### Verify
- `pnpm exec vitest run packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`
  → still passes (unit-level fix).
- New test in `run.test.ts` exercises the full path: stub a registry that
  returns one addon with `name: "vscode-overlay"`, supply a config with
  `addons: [{src: "/some/path", config: {decks: {shortcuts: {autoShow: false}}}}]`,
  assert that `addonConfigOverrides` resolves to the addon by manifest name.

### Done
- A test that simulates the user's exact config proves the override now
  reaches the addon-deck materialize step.

## Task 2: update STATE.md + SUMMARY.md + commit

### Files
- `.planning/STATE.md`
- `.planning/quick/010-addon-config-override-key/010-SUMMARY.md`

### Done
- Quick-task row added to STATE.md
- SUMMARY.md written (2-3 sentences + files + commit)
- Atomic commit