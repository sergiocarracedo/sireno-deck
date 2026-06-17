---
phase: 72-system-buttons-dispatcher-and-deck-icon
plan: 72-01
wave: 1
depends_on: []
status: executed
---

# 72-01-SUMMARY

## What was built

BUG-04 fix shipped: the `icon` field is now a first-class optional field on a deck config. It survives every loader seam and reaches `OverlayToggleButton` as the primary badge source. The render uses a 4-tier fallback chain: configured `icon` (via existing `iconConfigToProps` utility) → first emoji of deck name (unchanged) → uppercase first character of deck name (NEW) → `layout-grid` icon (defensive fallback for empty deckName).

The `icon` field follows the same conventions as the action button icon: `icon://<name>` for Lucide, raw path for image sources. The existing `iconConfigToProps` utility at `packages/cli/src/ui/Icon.tsx:103` handles the routing — no new utility was needed.

## Key files

- `packages/cli/src/core/schemas.ts` — `CoreDeckConfigSchema` adds `icon: z.string().min(1).optional()`; `DeckConfig` interface adds `icon?: string`; `getDeckPayload` exclusion list adds `icon` so addons don't try to validate it as a config field; both `expandDecks` paths (non-addon line 470-471, addon line 509-510) carry `icon: deck.icon` into the `CoreDeckConfigSchema.safeParse` call; the addon-generated deck overlay at line 549 now overlays both `background` and `icon`; the final `decks[deckKey]` builder at line 654-657 spreads `icon` from `bootstrap.decks[deckKey]`.
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` — added `iconConfigToProps` import + `extractNameInitial` helper + 4-tier fallback chain in the badge slot.
- `packages/cli/src/core/schemas.test.ts` — 3 new tests: configured icon round-trip, deck without icon (backwards compat), empty icon string rejection.
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.test.tsx` — updated existing "no-emoji" test to assert the new name-initial fallback ('P' for 'Plain Deck'); added new "configured icon wins" test (icon is rendered instead of layout-grid).

## Decisions made

1. **Used `iconConfigToProps` (not `resolveIconSpec`).** `iconConfigToProps` returns ready-to-spread `IconProps` (handles `icon://` prefix → `{ name }`, raw path → `{ src }`). The other action buttons use `resolveIconSpec` because they pass the result to `IconLabelSurface` (which takes a `ResolvedIconSpec`). `OverlayToggleButton` uses the raw `Icon` component, so `iconConfigToProps` is the cleaner fit.
2. **Removed the unreachable `layout-grid` fallback test.** With the new fallback chain, the layout-grid branch is only reachable when `deckName === ""` — but `id` is required on `DeckConfig`, so `deckName = name ?? id` is always non-empty. The defensive layout-grid branch is kept in code (handles future schema changes) but no test exercises it.
3. **Adjusted the "configured icon wins" test.** Originally planned to assert `not.toContain('📺')` with a deck name '📺 Netflix'. But the deck name LABEL contains '📺 Netflix', so the assertion was wrong. Changed to use 'My App' (no emoji) and assert the icon is rendered + layout-grid is NOT rendered — clearer intent.

## Notes for downstream

- **The 5 loader seams (plan-checker finding) are ALL updated.** `CoreDeckConfigSchema` schema field + `DeckConfig` interface + `getDeckPayload` exclusion list + 2 `expandDecks` safeParse call sites + addon-generated deck overlay + final `decks[deckKey]` builder spread. The plan-checker's MAJOR concern was caught: a schema-only patch would have dropped the field at the loader seam.
- **Addons cannot read `icon` as a payload field** because it's in the `getDeckPayload` exclusion list. If a future addon wants `icon` in its configSchema, it must be added there too. Document this constraint in the addon API docs (not done in Phase 72).
- **The `OverlayToggleButton` is now consumed by `BUG-03` (Wave 2)** — the dispatcher at `runtime.ts:1094-1107` reuses the same fallback chain for the secondary slot of the 2-line SplitActionSurface variant.

## Verification

- `pnpm --filter sireno-deck-cli test schemas` → **14/14 PASS** (3 new icon tests added).
- `pnpm --filter sireno-deck-cli test OverlayToggleButton` → **6/6 PASS** (2 new tests added, 1 existing test updated).
- `pnpm --filter sireno-deck-cli test runtime gesture-state` → **79 failed / 42 passed** (matches v1.6 + Phase 71 baseline of 79 failed / 36 passed). **Zero new failures introduced by 72-01.**

**BUG-04 requirement satisfaction:** `CoreDeckConfigSchema` accepts optional `icon?: string`; field survives `validateConfig` → `parseRawDeck` → `expandDecks` → `OverlayToggleButton` render; 4-tier fallback chain renders the configured icon next to `send-to-back`.
