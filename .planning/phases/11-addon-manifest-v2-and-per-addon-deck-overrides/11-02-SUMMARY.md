# Plan 11-02 Summary

**Completed:** 2026-07-21

## What was built

- `AddonConfigSchema` + `AddonDeckOverrideSchema` schemas in `schemas.ts`. `AddonEntrySchema` object form gains `config?` field.
- `materializeAddonDecks` accepts `addonConfigOverrides: Map<addonName, {addonWideConfig, perDeck}>` parameter. Per-deck overrides apply field-level + force-isOverlay. Suffix-form keys (`shortcuts`) match full ids (`chrome-overlay:shortcuts`).
- `run.ts:buildRuntime` collects addon overrides from `config.addons[i].config` into the override map and threads it into `materializeAddonDecks`.
- 4 new tests cover the override apply paths.

## Key files

- `packages/cli/src/config/schemas.ts` — `AddonDeckOverrideSchema`, `AddonConfigSchema`, `AddonEntrySchema` updated.
- `packages/cli/src/cli/commands/addon-decks.ts` — new `AddonDeckOverride` interface, `materializeAddonDecks` accepts `addonConfigOverrides` map.
- `packages/cli/src/cli/commands/run.ts` — build override map from `config.addons`.
- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts` — 4 new tests; removed 3 quick-006 describe-block tests.
- `config.yml` — already uses the new `addons[i].config.decks.<deckId>` shape (user-edited).

## Decisions made

- Suffix-form keys accepted (matches by stripping `<addon>:` prefix from generated deck id) — friendlier config syntax.
- `addonWideConfig` is everything under `addons[i].config` EXCEPT `decks` — opaque to the schema since addon-specific extra keys aren't enumerable.
- Field-level overrides propagate through the existing `mapAddonDeckToRuntimeDeck` (trigger override → `processNames`/`windowNames`).

## Test status

- `addon-decks.test.ts`: 23/24 pass. 1 pre-existing failure (`maps addon-generated deck buttons`).
- Full suite net: 5 quick-006 tests now fail because their `overlay:` symbols were removed (11-03 deletes them).

## Notes for downstream

- `AddonOverlayOverrideSchema` (with `addon: string` field) is dead code now — deleted in 11-03.
- 11-03 also removes `materializeDeckFromConfig` helper, `userOverlayDecks` array, `addonOverrideMap` build (the one in run.ts that quick-006 added).

## Commit

`0ee2df0`