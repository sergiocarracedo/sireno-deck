# Quick Task 006 Plan

## Task 1: Add `overlay:` config schema + build user overlay decks

**Files:** `packages/cli/src/config/schemas.ts`, `packages/cli/src/cli/commands/run.ts`, `packages/cli/src/config/validation.ts`, `packages/cli/src/config/__tests__/schemas.test.ts`

**Action:**
- In `schemas.ts:105-112` `RawConfigSchema`, add `overlay: OverlayConfigSchema.optional()`.
- Define `OverlayConfigSchema = z.record(z.string(), z.union([UserOverlayDeckSchema, AddonOverlayOverrideSchema]))`.
- `UserOverlayDeckSchema` reuses `DeckDefSchema` shape with `trigger` required (overlay decks must match).
- `AddonOverlayOverrideSchema = z.object({ addon: z.string(), autoShow: z.boolean().optional(), name: z.string().optional(), icon: IconSourceSchema.optional(), trigger: TriggerSchema.optional(), config: z.record(z.string(), z.unknown()).optional() }).strict()`.
- In `run.ts:buildRuntime`, after the `Object.entries(config.decks).flatMap` loop, add a parallel loop for `Object.entries(config.overlay ?? {})` that produces user-overlay RuntimeDecks (same shape but `isOverlay: true` and joined to user overlay list).
- Pass the overlay map to `materializeAddonDecks` (Task 2 will consume it).

**Verify:** `pnpm vitest run packages/cli/src/config/__tests__/schemas.test.ts` — schema accepts both shapes, rejects unknown fields.

**Done:** Schema validates; `buildRuntime` produces user overlay RuntimeDecks with `isOverlay: true`.

## Task 2: `materializeAddonDecks` accepts + applies overlay overrides

**Files:** `packages/cli/src/cli/commands/addon-decks.ts`, `packages/cli/src/cli/commands/run.ts`, `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`

**Action:**
- Add parameter to `materializeAddonDecks`: `overlayOverrides?: ReadonlyMap<string, { addonName: string; autoShow?: boolean; name?: string; icon?: string; trigger?: unknown; config?: Record<string, unknown> }>` (keyed by addon deck id returned by createDecks).
- Build the overrides map in `run.ts` from `config.overlay`: for each entry where value has `addon:` field, look up the addon in the registry, find the deckType (by the addon's `decks` key matching `addon`), pre-call `createDecks({config: override.config ?? {}, deck: {id: addonDeckId}, keyCount})` shape to discover the generated deck ids, then key the override map by generated deck id.
- When `mapAddonDeckToRuntimeDeck` materializes a deck whose id is in the overrides map and the addon matches:
  - Merge `override.config` into the addonConfig passed to `createDecks({config})` (deeper merge than current shallow).
  - After mapping, overlay `autoShow`, `name`, `icon`, `trigger` onto the resulting RuntimeDeck (only if override provides them).
- In `run.ts:overlayDecks()` (well, `runtime.ts:575`), ensure iteration order: user overlay decks first, then addon overlay decks, then legacy `decks:` with triggers (lowest priority).

**Verify:** `pnpm vitest run packages/cli/src/cli/commands/__tests__/addon-decks.test.ts` — new test asserts `autoShow: false` from override overrides `autoShow: true` from chrome-overlay addon.

**Done:** Addon overlay overrides apply; iteration order puts user overlay first.

## Task 3: Iteration order fix in `overlayDecks()` + test

**Files:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/__tests__/runtime.test.ts`

**Action:**
- In `runtime.ts:575` `overlayDecks()`, accept the runtime's `decks` list as-is but document/expose iteration order. The runtime already builds `decks` from `[...userDecks, ...addonDecks]` in `buildRuntime`. Move addon overlay decks to come BEFORE legacy `decks:` with triggers so chrome-overlay wins over legacy chrome:.
- Specifically: change `buildRuntime` (`run.ts:524`) so `materializeAddonDecks` returns `addonDecks` BEFORE user decks with triggers (user overlay decks come first, addon overlay decks next, legacy `decks:` with triggers last). Simplest: in `buildRuntime`, split `config.decks` into overlay-mode (has `trigger`) and nav-mode (no `trigger`); build nav-mode + addon overlay overrides + user overlay, in priority order.
- Add a test in `runtime.test.ts`: create runtime with user's `chrome:` (autoShow:false, trigger matches) AND chrome-overlay addon's `shortcuts` (autoShow:true, trigger matches); assert `computeOverlayFor(chromeSnapshot)` returns chrome-overlay's `shortcuts` and `applyOverlay` activates it.

**Verify:** `pnpm vitest run packages/cli/src/deck/__tests__/runtime.test.ts` — new test passes.

**Done:** Auto-show fires for chrome-overlay even when user's `chrome:` is in `decks:` with the same trigger.