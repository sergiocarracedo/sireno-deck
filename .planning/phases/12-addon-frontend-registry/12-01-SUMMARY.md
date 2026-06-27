# Plan 12-01 Summary

**Completed:** 2026-06-27

## What was built

Foundation for addon frontend registry: AddonManifest now carries `publishIntervalMs` (the cadence the CLI will use in Plan 12-02). The vite plugin emits a new `virtual:sireno/addons/registry` module that maps `core:*` types to `{ addonName, Component }` for every built-in addon that ships a `frontend.tsx`. The CLI's `buildDeckConfigMessage` adds `addonName` and `frontendEntry` to each button (looked up via a `Map<type, AddonFrontendRef>`). The frontend `Deck.tsx` reads the registry and renders the matching component as the children of `<ButtonFrame>`, replacing the type-name label fallback.

## Key files

- `packages/cli/src/addon/api.ts` — added `publishIntervalMs?: number` to `AddonManifest`.
- `packages/cli/src/vite/virtual-modules.ts` — added `buildAddonsRegistryModule(addons)` and registered `virtual:sireno/addons/registry`. Each entry imports the addon's frontend and exposes it under every `core:*` type that addon provides.
- `packages/cli/src/vite/virtual-modules.test.ts` (new) — 8 tests covering empty registry, per-type mapping, no-frontend skip, no-buttons skip, scoped names.
- `packages/cli/src/cli/commands/emulator-mode.ts` — exported `AddonFrontendRef`, made `buildDeckConfigMessage` take a `Map<string, AddonFrontendRef>` and add `addonName` + `frontendEntry` per button. `RunEmulatorModeOptions.addonByType` is optional.
- `packages/cli/src/cli/commands/emulator-mode-build-config.test.ts` (new) — 4 tests covering addonName + frontendEntry inclusion, unknown type omission, null frontendEntry omission, position preservation.
- `packages/cli/src/cli/commands/addon-registry.ts` (new) — `collectBuiltinAddonRegistry()` scans `packages/cli/src/builtin-addons/*/{index.ts,index.tsx}` for `type: "core:foo"` declarations + `frontend: { main: "..." }` and builds the `Map<type, AddonFrontendRef>`.
- `packages/cli/src/cli/commands/addon-registry.test.ts` (new) — 4 tests for `buildAddonByType`.
- `packages/cli/src/cli/commands/run.ts` — passes `collectBuiltinAddonRegistry().byType` to `runEmulatorMode`.
- `packages/cli/frontend/src/components/Deck.tsx` — imports `addonRegistry` from `virtual:sireno/addons/registry`. For each button, looks up the registry entry and renders `<RegistryEntry.Component config={...} state={null} />` as the children of `<ButtonFrame>`. Falls back to the type-name label if no entry.

## Decisions made

- **Registry shape**: `Record<core:type, { addonName, Component }>`. The frontend imports the registry directly from the virtual module.
- **`buildDeckConfigMessage` API**: takes a `Map<string, AddonFrontendRef>`. Default empty map → no addon metadata in deck-config (backward compatible). The CLI builds the map by scanning `packages/cli/src/builtin-addons/*/index.tsx` for `type:` and `frontend:` declarations.
- **Position preserved**: `position` is still set on each button; the registry is a separate concern.
- **`AddonManifest.publishIntervalMs`**: optional. Default in Plan 12-02 is 1000ms.

## Deviations

None. All 6 tasks completed as planned.

## Notes for downstream

- Plan 12-02 (CLI state publishing) uses the `Map<type, AddonFrontendRef>` from `collectBuiltinAddonRegistry()` to know which addon publishes to which channel.
- Plan 12-03 (7 addon frontends) will register the addon manifests with `frontend: { main: "./frontend.tsx" }` and `publishIntervalMs` so the registry + deck-config metadata become populated.
- The frontend's `Deck.tsx` renders `state={null}` until Plan 12-02 wires up the `useAddonChannel` subscription inside each addon frontend.

## Commits

- `ae30398` — AddonManifest.publishIntervalMs field
- `a86d149` — virtual:sireno/addons/registry virtual module + tests
- `aa7bc57` — buildDeckConfigMessage adds addonName + frontendEntry per button
- `b4ad64e` — scan builtin addons + build type→addon map for deck-config
- `452e589` — Deck.tsx renders addon components from virtual:sireno/addons/registry
