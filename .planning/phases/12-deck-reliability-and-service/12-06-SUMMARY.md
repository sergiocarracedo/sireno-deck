# Plan 12-06 Summary

**Completed:** 2026-07-23

## What was built

Make the emulator Addons page show every registered addon (with source path, deck counts, overlay vs regular, button counts) as a wrapped flow of colored tags with a legend, and make the Config page show the resolved absolute config path.

## Key files

- `packages/cli/emulator/src/pages/AddonsPage.tsx` — renders the addon flow: each addon's `name` and `path` (the real addon path, not the old `'json'` source string) followed by grouped deck tags (regular / overlay / paginated / internal) and button tags. A legend at the top (`data-testid="addons-legend"`) explains the color code for internal, deck, overlay, and button tags.
- `packages/cli/emulator/src/components/Tag.tsx` — added `internal` color variant (rose) for internal addons' decks/buttons.
- `packages/cli/emulator/src/pages/ConfigPage.tsx` — renders `configPath` as a monospace header above the config dump (`data-testid="config-page-path"`).
- `packages/cli/emulator/src/App.tsx` — fetches `getConfigPath` on WS open (method-call RPC) and subscribes to the `addonInventory` state channel. The fetched configPath is passed to ConfigPage.
- `packages/cli/src/cli/addon-handler-bridge.ts` — `publishAddonInventory` now emits `{ addons: [{ name, path, internal, buttonTypes, decks }] }` for every loaded addon (builtins + third-party via `AddonRegistry.listAddons`).
- `packages/cli/src/cli/commands/addon-registry.ts` — `ScannedAddon` carries `path` and `internal`. `core` and `internal-settings` are flagged `internal: true`. `scanAddonJsonManifest` and `scanAddonDir` set the real addon path.
- `packages/cli/src/cli/commands/run.ts` — `buildExternalScannedAddons` helper merges registry-loaded third-party addons using `externalAddonDirs`, so the bridge sees chrome-overlay / vscode-overlay / opencode-overlay alongside the builtins.

## Tests

- `packages/cli/emulator/src/__tests__/AddonsPage.test.tsx` — 6 cases: loading state, addon name + path rendering, grouped decks + button types, paginated grouping (base name + `(paginated)` marker), overlay marker, and a new legend presence test that asserts the legend container renders with internal/deck/overlay/button text.
- `packages/cli/emulator/src/__tests__/ConfigPage.test.tsx` — 5 cases: error state, content fetch, path display, error handling, missing-path behavior.
- Test run: `vitest run packages/cli/emulator/src/__tests__/AddonsPage.test.tsx packages/cli/emulator/src/__tests__/ConfigPage.test.tsx` — 11/11 pass.

## Decisions made

- **`path` field on the bridge payload, not the old `source: 'json' | 'regex'` string.** The user explicitly asked for the real addon path so the emulator can show "this addon lives here." The bridge now emits a `path: string` plus an `internal: boolean` derived from the addon name (`core`, `internal-settings`).
- **Legend added in this session.** Plan 12-06 task 02 only required the tag flow; the legend was added because the user-facing AddonsPage now needs disambiguation between regular / overlay / internal / button tags. The legend uses existing `<Tag>` primitives (no parallel component).
- **Third-party addons flow through the same `publishAddonInventory` channel.** `run.ts` builds `ScannedAddon` records for external addons using `externalAddonDirs` (paths from `config.addons[]`), so chrome-overlay / vscode-overlay / opencode-overlay appear with their absolute paths.

## Notes for downstream

- The `addons-legend` data-testid is the canonical anchor for snapshot/visual tests.
- The `addonInventory` payload shape is the contract between backend and frontend; any new metadata field should be added here first, then in App.tsx / AddonsPage.tsx.
