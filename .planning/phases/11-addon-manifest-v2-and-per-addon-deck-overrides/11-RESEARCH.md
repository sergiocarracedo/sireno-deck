# Phase 11 Research — Addon Manifest v2 + Per-Addon Deck Overrides

**Phase:** 11
**Status:** Ready for planning

## Don't Hand-Roll

The current manifest shape accepts three forms already inside `AddonRegistry.load()` (`registry.ts:81-107`): raw function, `{deck: factory}`, and the canonical `AddonDeckDefinition` with `{type, createDecks}`. The new format unifies all three into a single array form where each entry either IS a deck (static), produces ONE deck via `createDeck`, or produces MANY decks via `createDecks`. Don't invent a fourth or fifth shape; pick the array form and replace the existing logic. Zod doesn't do much work here because manifest validation happens at runtime (TypeScript types are the contract), but a hand-rolled validator at manifest-load time catches the old shape with a clear error pointing at the addon name.

## Common Pitfalls

- **Empty `id`**: With the new shape, an entry's `id` is what `materializeAddonDecks` looks up. If a static or single-dynamic entry omits `id`, the addon can't be navigated to from `core:change-deck` or referenced in `addons[i].config.decks`. The runtime should reject empty/missing ids at manifest-load and point at the addon name in the error.
- **Addon-name prefix drift**: The new shape moves from `decks: { "<addon>:<deck>": ... }` (prefix in the key) to `decks: [{ id: "<addon>:<deck>", ... }]` (prefix in the entry's id). Both must start with `${manifest.name}:` or collision risk is high (two addons both having `shortcuts`). Reuse the existing prefix-validation logic at `registry.ts:62-67`.
- **Cross-addon config merge order**: User said "both merge, addon config wins". The order must be `{...defaultButtonConfig, ...addons[i].config ?? {}}`. Default-first ensures user's `config:` always wins. Tested explicitly.
- **Per-deck overrides arrive after `createDecks`** — overrides apply on top of the generated deck, not inside the factory. Existing addon-deck materialization runs `createDecks({config})` first, then maps the result to RuntimeDeck. We piggyback on that — overrides don't reach the factory unless the user puts them under `addons[i].config.decks.<deckId>.config`, which is merged into the per-addon addonConfig BEFORE `createDecks` runs (same merge order as the host-level config).
- **`createDeck` vs `createDecks` collision**: An entry with both is ambiguous. Reject at manifest-load.
- **`addons:` schema strictness**: The new `AddonEntrySchema` object form gains `config?` and that config's `decks` is `Record<deckId, ...>`. Don't allow `config` to escape into any other key the addon doesn't declare. The strict zod `.strict()` on the addon config object already prevents typos.
- **Quick-006 overlay: reverts touch tests** — the 5 schema tests and 3 addon-override tests added in quick-006 (`OverlayConfigSchema` describe block + 3 override tests in `addon-decks.test.ts`) all reference symbols that go away. Remove them in the same commit as the revert or the suite fails.

## Existing Patterns in This Codebase

- **Manifest validation pattern** (`registry.ts:23-67`): `load()` already validates addon-name prefix on button types (`registry.ts:30-35`) and deck names (`registry.ts:62-67`). Throw with the addon name in the message. Reuse this pattern for the new entry-level id validation.
- **Config-merge pattern** (`addon-decks.ts:189-209` — pre-quick-006): `addonConfigs` is a `Map<addonName, config>`, populated by `collectAddonDefaultButtonConfig` which walks the user's decks looking for buttons matching each addon's `defaultButton`. The new `addons[i].config` extends this — merge into the same map slot before `createDecks({config})` runs.
- **Addon-deck id collision check** (`addon-decks.ts:208, 232-238`): `userDeckIds` set prevents a user deck and addon deck from sharing an id. Reuse this — the new `id` field on addon entries is checked the same way.
- **Per-field override apply** (quick-006 `addon-decks.ts:228-256`): The override map already builds field-level overrides (`autoShow`, `name`, `icon`, `trigger`) applied on top of the generated deck. Reuse this exact pattern for the new `addons[i].config.decks` overrides; just relocate the map-building into the new code path.
- **Trigger-derived `isOverlay`** (quick-006 `run.ts:464-466`): If a user-deck has `trigger`, it becomes `isOverlay: true`. Same logic applies to addon-deck overrides: when user sets a `trigger` override, force `isOverlay: true`. Mirror the existing logic.
- **Config-side Zod patterns** (`schemas.ts:68-76`): `AddonEntrySchema = z.union([z.string(), z.object({...}).strict()])`. The new object form gains `config: z.record(z.string(), z.unknown()).optional()` for addon-wide config; the `decks` sub-record has stricter shape (`autoShow`, `name`, `icon`, `trigger`, `config`).

## Recommended Approach

3 plans, vertical slices (each delivers one demoable behavior):

1. **11-01: Manifest array format + addon migration** — rewrite `AddonManifestV1.decks` to array, rewrite `AddonRegistry.load()` to walk the array, hard-cutover reject old format, migrate chrome-overlay/vscode-overlay/opencode-overlay. **Done = chrome-overlay addon loads and its `shortcuts` deck is registered.**
2. **11-02: `addons[i].config` schema + per-deck overrides** — extend `AddonEntrySchema`, wire `addonConfig` merge in `materializeAddonDecks`, build per-deck override map from `addons[i].config.decks`, apply field-level + config-merge overrides. **Done = user puts `{autoShow: false}` under `addons[i].config.decks.<deckId>` and chrome-overlay's autoShow flips.**
3. **11-03: Revert quick-006 + cleanup** — remove top-level `overlay:` schema, `AddonOverlayOverrideSchema`, `materializeDeckFromConfig` helper, overlay-first iteration order, `addonOverrides` parameter on `materializeAddonDecks`. Delete 5 schema tests + 3 addon-override tests. Update ROADMAP to mark revert done. **Done = top-level `overlay:` parses as unknown key (strict rejection), all tests still pass.**

Wave assignment: 11-01 → Wave 1 (independent), 11-02 → Wave 1 (independent of 11-01, depends only on the runtime from Phase 10), 11-03 → Wave 2 (must run after 11-02 so the per-deck overrides have a working path before we tear down the overlay: shortcut).

Wait — let me reconsider. 11-02 needs `materializeAddonDecks` to handle the override map, which is independent of the manifest array shape. So 11-01 and 11-02 can be Wave 1 (parallel, no file conflict). 11-03 must be Wave 2 because removing `overlay:` invalidates any quick-006 tests that test it; but the new tests in 11-02 use `addons[i].config.decks` not `overlay:`, so 11-03 just removes dead code without breaking 11-02. Wave 2 is correct.

**Vertical-slice check:**
- 11-01 demoable: load chrome-overlay addon, see the `shortcuts` deck appear with `id: "chrome-overlay:shortcuts"` in the runtime's deck list. End-to-end: manifest → registry → getDeckType lookup → materializeAddonDecks.
- 11-02 demoable: put `addons[i].config.decks.chrome-overlay:shortcuts.autoShow: false` in config.yml, see chrome-overlay not auto-activate on chrome focus. End-to-end: config schema → materializeAddonDecks merge → RuntimeDeck.autoShow.
- 11-03 demoable: put `overlay:` block in config.yml, see a "unknown key overlay" validation error from `RawConfigSchema.strict()`. End-to-end: schema → validation error.

## Open Questions

None — user already answered all four clarifying questions during add-phase (addon config vs overlay: = replace top-level overlay:; old format = hard cutover; config merge = both, addon config wins; migration = same phase).

## Files To Modify (across all plans)

- `packages/cli/src/addon/api.ts` — `AddonManifestV1.decks` becomes an array of `AddonDeckEntry`; new types `AddonDeckEntry` (static | single-dynamic | multi-dynamic). Remove `AddonDeckDefinition` and `AddonDeckFactory` if no longer used elsewhere.
- `packages/cli/src/addon/registry.ts` — `load()` walks the array; rejects old `Record<key, ...>` shape (TypeScript type-level rejects, but runtime validation catches addons shipping old shape via `require()`).
- `packages/cli/src/config/schemas.ts` — `AddonEntrySchema` object form gains `config` field with `decks` sub-record. `OverlayConfigSchema`, `AddonOverlayOverrideSchema`, `AddonOverlayDeckOverridesSchema` removed.
- `packages/cli/src/cli/commands/addon-decks.ts` — accept new `addonConfigOverrides: Map<addonName, config>` and `deckOverrides: Map<deckId, AddonDeckOverride>` params; drop `addonOverrides` param. Apply field-level + config-merge overrides.
- `packages/cli/src/cli/commands/run.ts` — remove `materializeDeckFromConfig` helper, remove overlay loop, remove `addonOverrideMap` build, restore `effectiveDecks` to `decks` only.
- `packages/cli/src/config/__tests__/schemas.test.ts` — remove 5 quick-006 OverlayConfigSchema tests; add new tests for `addons[i].config.decks` shape.
- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts` — remove 3 quick-006 addon-override tests; add new tests for addonConfig merge + per-deck override apply.
- `~/works/opensource/sireno-deck-addons/chrome-overlay/index.js` — `decks: { "chrome-overlay:shortcuts": {...} }` → `decks: [{ id: "chrome-overlay:shortcuts", ...static fields, buttons }]`. Drop the `type` field.
- `~/works/opensource/sireno-deck-addons/vscode-overlay/index.js` — same shape migration.
- `~/works/opensource/sireno-deck-addons/opencode-overlay/index.js` — same shape migration.
- `config.yml` — restructure `addons:` entries to use the new `{src, config}` shape with `config.decks.chrome-overlay:shortcuts.autoShow: false` for the user override.
- `.planning/ROADMAP.md` — Phase 11 plans marked complete.

## Confidence

- HIGH on the manifest rewrite (existing registry.ts is the template; addon migration is mechanical).
- HIGH on the addonConfig merge pattern (already implemented in quick-006, just relocated).
- HIGH on the test removal (revert of quick-006 is straightforward).
- MEDIUM on whether to delete `AddonDeckDefinition`/`AddonDeckFactory` from `api.ts` (other modules might still import them; check during plan execution).
- LOW on whether the 3 Phase-10 addons have any non-obvious `internal` field on their deck definitions — looking at chrome-overlay, none do. The 3 addons are uniform.