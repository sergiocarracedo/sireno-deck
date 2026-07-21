# Quick Task 006 — Overlay config key + addon overrides

**Task:** Move overlay-mode decks to a top-level `overlay:` key in `config.yml`. Support both user-defined overlay decks and addon-deck overrides. Also fix autoShow not firing for addon overlay decks.

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Task Boundary

User wants two things:

1. **New `overlay:` config key** with two sub-types:
   - **User overlay deck**: full def (trigger, autoshow, name, icon, buttons) — equivalent to a top-level deck with a trigger.
   - **Addon overlay override**: `<addon-name>: <deck-id>: <overrides>` — references an addon's generated deck and applies field-level overrides (autoShow, name, icon) plus an extra `config` object passed to the addon's `createDecks({config})` factory.

2. **Fix autoShow not firing**: chrome-overlay addon has `autoShow: true` and `trigger.process_name: ['chromium', 'chrome', ...]`. User has their own `chrome:` deck in `decks:` with the same trigger and `autoShow: false`. `overlayDecks()` iterates `[...userDecks, ...addonDecks]`; user's `chrome:` deck wins by first-match; `applyOverlay` sees `autoShow: false` and bails. The chrome-overlay addon's `shortcuts` deck never activates.

## Root cause for autoShow bug

`computeOverlayFor` (runtime.ts:645) iterates `overlayDecks()` which is `[...userDecks, ...addonDecks]`. When two decks match, first-match wins (specificity tie). User's `chrome:` deck matches first; `applyOverlay` checks `deck.autoShow !== true` and returns early — chrome-overlay's `shortcuts` deck is shadowed.

The proposed `overlay:` key fix also addresses this: overlay-mode decks are explicitly listed and consulted separately, in priority order.

</domain>

<decisions>
### Implementation Decisions

### Schema (Task 1)
- Add `overlay?: OverlayConfigSchema` to `RawConfigSchema` (`schemas.ts:105`).
- `OverlayConfigSchema = z.record(z.string(), z.union([UserOverlayDeckSchema, AddonOverlayOverrideSchema]))`.
  - Key is the deck id (e.g. `myapp`, `chrome-overlay`, `chrome`).
  - Value discriminates by shape: if it has `addon:` field → AddonOverride; else → UserDeck.
- `UserOverlayDeckSchema` reuses `DeckDefSchema` (drops `trigger` requirement? — no, keeps it required since overlay decks must match an app).
- `AddonOverlayOverrideSchema = { addon: string; autoShow?: boolean; name?: string; icon?: string; trigger?: Trigger; config?: Record<string, unknown> }`.
- `RawConfigSchema` keeps `decks:` for nav-mode decks. Existing user `chrome:` deck in `decks:` stays valid (back-compat) but should warn at boot to migrate.

### Build pipeline (Task 2)
- `buildRuntime` (`run.ts:420`) reads `config.overlay` and produces user overlay RuntimeDecks (parallel to `Object.entries(config.decks)`).
- `materializeAddonDecks` (`addon-decks.ts:189`) accepts an `overlayOverrides: Map<deck-id, AddonOverlayOverride>` parameter; when materializing a deck with a matching id under the addon's name, applies overrides:
  - `autoShow`, `name`, `icon`, `trigger`, `isOverlay` (set to true) → override on the resulting RuntimeDeck
  - `config` → merged into `addonConfig` passed to `createDecks({config})`
- `overlayDecks()` iteration order: user overlay decks first, then addon overlay decks (with overrides), then any remaining `decks:` with triggers. User overlay wins over addon overlay wins over legacy `decks:` with trigger.
- `applyOverlay` already handles `autoShow` correctly; the fix is just iteration order.

### Test
- Schema: accepts both variants; rejects unknown fields.
- Build: chrome-overlay's `shortcuts` deck gets `autoShow: false` from override.
- Runtime: when user has both legacy `chrome:` (autoShow:false) and chrome-overlay addon (autoShow:true) with same trigger, chrome-overlay wins.
</decisions>

<specifics>
## Specific Ideas

- `chrome-overlay` addon's manifest declares `decks: { "chrome-overlay:shortcuts": { createDecks: () => ({shortcuts: {...autoShow: true, ...}}) } }`. The user's override path is `<addon-name>: <deck-id-as-returned-by-createDecks>`, so for chrome-overlay it's `overlay.chrome-overlay.shortcuts.autoShow: false`.
- Back-compat: legacy `decks:` with a `trigger` continues to work; boot-time warning suggests migrating to `overlay:`.
- `addon:` field in `AddonOverlayOverrideSchema` is required and names the addon (must match a loaded addon).
- `trigger` field in AddonOverlayOverrideSchema replaces the addon's default trigger if present — useful for narrowing a generic addon trigger (e.g. chrome-overlay's broad trigger to specific binary).

## Key files

- `packages/cli/src/config/schemas.ts` — add `OverlayConfigSchema`, extend `RawConfigSchema`
- `packages/cli/src/cli/commands/run.ts:420-518` — `buildRuntime` reads `config.overlay` and produces user overlay RuntimeDecks
- `packages/cli/src/cli/commands/addon-decks.ts:189-244` — accept `overlayOverrides`, apply field-level + config-merge overrides
- `packages/cli/src/deck/runtime.ts:575-600` — `overlayDecks()` iteration order: user overlay → addon overlay → legacy decks with trigger
- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts` — add override tests
- `packages/cli/src/config/__tests__/validation.test.ts` — schema validation
- `packages/cli/src/cli/commands/__tests__/emulator-mode-build-config.test.ts` — override applies in built config

## Migration path

User's existing `chrome:` deck in `decks:` stays valid; the chrome-overlay autoShow bug is fixed by the new `overlay:` schema + iteration order, not by removing the legacy `chrome:` deck. After user migrates their chrome: deck to `overlay:`, the autoShow fix becomes deterministic.
</specifics>