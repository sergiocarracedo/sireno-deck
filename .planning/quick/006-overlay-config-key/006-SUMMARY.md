# Quick Task 006 Summary

**Task:** Move overlay decks to a top-level `overlay:` key in `config.yml`. Support user-defined overlay decks and addon-deck overrides. Fix autoShow not firing for addon overlay decks.

**Completed:** 2026-07-21

## What was done

1. **Schema** — Added `OverlayConfigSchema` (`schemas.ts`) accepting both user overlay decks (`{trigger, autoShow, ...}`) and addon override sections (`{addon, autoShow?, name?, icon?, trigger?, config?}`). Two-level nesting for addon overrides: `overlay.<addon-name>.<deck-id>`.

2. **Build pipeline** — Extracted `materializeDeckFromConfig` helper in `run.ts`. New `buildRuntime` reads `config.overlay` first, builds user overlay decks, then reads `config.decks`. Aggregates addon overrides into a map keyed by addon-deck-id (returned by `createDecks`).

3. **Addon overrides** — `materializeAddonDecks` accepts an `addonOverrides` map. For each addon, it aggregates all matching overrides' `config` and threads them into `createDecks({config})` so the addon sees the merged config before generating decks. Field-level overrides (autoShow/name/icon/trigger) apply on top of the generated deck; `isOverlay` is forced true.

4. **Iteration order fix** — `buildRuntime` puts `overlay:` decks ahead of `decks:` decks in the runtime's deck list. So when both an addon's autoShow:true deck and a user's legacy autoShow:false deck match the same trigger, the addon wins. This fixes the autoShow-not-firing UAT report.

## Files changed

- `packages/cli/src/config/schemas.ts` — `AddonOverlayOverrideSchema`, `OverlayDeckEntrySchema`, `OverlayConfigSchema`; added `overlay` to `RawConfigSchema`
- `packages/cli/src/cli/commands/run.ts` — `materializeDeckFromConfig` helper; `buildRuntime` reads `config.overlay`, builds user overlay decks, aggregates addon overrides; iteration order puts overlay decks first
- `packages/cli/src/cli/commands/addon-decks.ts` — `materializeAddonDecks` accepts `addonOverrides` map; aggregates per-addon config overrides; applies field-level overrides
- `packages/cli/src/config/__tests__/schemas.test.ts` — 5 new tests for OverlayConfigSchema
- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts` — 3 new tests for addon overrides

## Commit

`4f6589b`