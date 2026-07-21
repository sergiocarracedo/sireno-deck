# Phase 11 Verification

**Phase:** 11 — Addon Manifest v2 + Per-Addon Deck Overrides
**Verified:** 2026-07-21
**Status:** PASSED

## Must-Have Verification

### 11-01: Manifest array format + addon migration

- ✅ `AddonManifestV1.decks: ReadonlyArray<AddonDeckEntry>` exported (`packages/cli/src/addon/api.ts`).
- ✅ 3 addons migrated (`chrome-overlay/index.js`, `vscode-overlay/index.js`, `opencode-overlay/index.js`) use `decks: [{id: '...', ...static fields, buttons}]`.
- ✅ Old `Record<key, {type, createDecks}>` shape causes a runtime error at `AddonRegistry.load()` (`packages/cli/src/addon/registry.ts:30-49`): "Addon 'X' uses legacy decks format...".

### 11-02: `addons[i].config` schema + per-deck overrides

- ✅ `addons[i].config` (addon-wide) reaches `createDeck(s)({config})` merged with `defaultButtonConfig` — verified by 4 new tests (`addon-decks.test.ts:651-744`).
- ✅ `addons[i].config.decks.<deckId>` field overrides (autoShow/name/icon/trigger) apply on top of the generated RuntimeDeck — verified by `applies per-deck autoShow override` test.
- ✅ Setting `trigger` override forces `isOverlay: true` and propagates to `processNames` — verified by `per-deck trigger override forces isOverlay` test.
- ✅ Suffix-form keys accepted (`shortcuts` matches `chrome-overlay:shortcuts`) — verified by `per-deck key matches suffix` test.

### 11-03: Revert quick-006 + cleanup

- ✅ Top-level `overlay:` is rejected by `RawConfigSchema.strict()` as an unknown key (no symbol references in source).
- ✅ No leftover `materializeDeckFromConfig`, `userOverlayDecks`, `addonOverrideMap`, `OverlayConfigSchema`, `AddonOverlayOverrideSchema`, `OverlayDeckEntrySchema`, `AddonOverlayDeckOverridesSchema` references (`rg` returns 0 matches).
- ✅ All 7 Phase 11 success criteria checked off in ROADMAP.

## Key Integration Links

- `addon-decks.ts:materializeAddonDecks` accepts `addonConfigOverrides` parameter; run.ts builds the map from `config.addons[i].config`.
- 3 Phase-10 addons (`chrome-overlay`, `vscode-overlay`, `opencode-overlay`) use the new array form; the 2 builtin addons (`core`, `internal-settings`) also migrated.
- `mapAddonDeckToRuntimeDeck` propagates trigger override via existing `processNames`/`windowNames` resolution.

## Requirement Coverage

This phase has no formal requirement IDs assigned in REQUIREMENTS.md. All 7 success criteria from the ROADMAP Phase 11 entry are met.

## Test Status

- Final: 29 failed / 994 passed (1023 total)
- Baseline (pre-phase-11, before commit `4f6589b2`): 30 failed / 987 passed (1017 total)
- Net: 0 new failures. 4 quick-006 tests removed; 4 new override tests added.

## Status

**PASSED** — Phase 11 goals verified end-to-end.