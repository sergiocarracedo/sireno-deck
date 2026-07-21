# Plan 11-01 Summary

**Completed:** 2026-07-21

## What was built

- `AddonManifestV1.decks` is now `ReadonlyArray<AddonDeckEntry>` instead of the legacy `Record<key, AddonDeckDefinition | AddonDeckFactory>` shape. The `type` field is gone — entries are either static (`{id, name, icon, ...}`), single-dynamic (`{id, createDeck: (cfg) => deck}`), or multi-dynamic (`{createDecks: (cfg) => {id: deck}}`).
- `AddonRegistry.load()` walks the array; rejects the old `Record` shape at runtime with a clear migration hint pointing at the addon name; validates entry id prefix `<addon>:`.
- `materializeAddonDecks` walks the array; uses synthetic `<addon>:__multi__` keys for multi-dynamic entries.
- All 5 addons in the workspace migrated: `core`, `internal-settings`, `chrome-overlay`, `vscode-overlay`, `opencode-overlay`.

## Key files

- `packages/cli/src/addon/api.ts` — `AddonDeckEntry` discriminated union; `AddonManifestV1.decks: ReadonlyArray<AddonDeckEntry>`; `AddonDeckEntryCtx`.
- `packages/cli/src/addon/registry.ts` — `load()` validates legacy shape (throws), walks array, registers each entry under its id (or synthetic multi key).
- `packages/cli/src/cli/commands/addon-decks.ts` — `materializeAddonDecks` walks `addon.decks` array.
- `packages/cli/src/builtin-addons/core/index.ts` — migrated from `Record` to array (multi-dynamic).
- `packages/cli/src/builtin-addons/internal-settings/index.ts` — migrated (single-dynamic).
- `~/works/opensource/sireno-deck-addons/chrome-overlay/index.js` — migrated (static).
- `~/works/opensource/sireno-deck-addons/vscode-overlay/index.js` — migrated (static).
- `~/works/opensource/sireno-deck-addons/opencode-overlay/index.js` — migrated (static).
- Test helpers updated to array form.

## Decisions made

- Synthetic multi-dynamic key `<addon>:__multi__` chosen over letting `materializeAddonDecks` call `entry.createDecks` directly — keeps all deck resolution routed through `AddonRegistry.getDeckType()` (single source of truth).
- `addonOverrides` parameter from quick-006 dropped here (overridden by 11-02's `addonConfigOverrides` + `addonDeckOverrides` map pair).
- Test helper `fakeManifestWithDecks` rewritten to produce multi-dynamic entries (preserves the test factories' record-keyed return shape).

## Test status

- `addon-decks.test.ts`: 20/23 pass. 3 failures: 1 pre-existing (`maps addon-generated deck buttons`), 2 quick-006 (`overlay:` override tests — removed in 11-03).
- `addon.test.ts`: 20/20 pass.
- `addon-core-lock.test.ts`: 2/3 pass (1 pre-existing).
- `integration.test.ts`: 2/3 pass (1 was quick-006 indirect).
- `validation.test.ts`: 3/8 pass (5 pre-existing for unrelated config validation).
- Full suite: 32 failed / 996 passed (baseline was 31/996 — the +1 is the 2 quick-006 tests; pre-existing 30 unaffected).

## Notes for downstream

- `AddonOverlayOverride` interface export is now unused (the `addonOverrides` param was the only consumer). Will be deleted by plan 11-03.
- `addonOverrides` parameter on `materializeAddonDecks` is gone; replaced by `addonConfigOverrides` + `addonDeckOverrides` in plan 11-02.
- The `addon` field in addon-config schema (config-side `addons[i].config.decks.<deckId>.addon`) is still unused — it's a 11-02 concern.

## Commit

`3542713`