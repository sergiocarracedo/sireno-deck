# P3: Favorites + Pagination Polish

## Goal
Favorites always visible with default emojis, launcher shows "Emojis" label, and pagination nav buttons render correctly on emoji list decks.

## Must-Haves
- [ ] Favorites category appears as first entry in category-list deck, even when `config.favorites` is empty
- [ ] When `config.favorites` is empty, 10 default emojis are shown (❤️ 🔥 ⭐ 😂 👍 🎉 💯 ✨ 🙏 👑)
- [ ] Launcher button renders "Emojis" text label (not "Emoji")
- [ ] `core:page-nav` pagination buttons render on emoji list decks for categories with >13 emojis
- [ ] All tests pass, updated to reflect new favorites behavior

## Tasks

### Task 1: Always show favorites with DEFAULT_FAVORITES fallback
**Files:** `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`
**Depends on:** None

Remove the `hasFavorites` guard (lines 37-65). Always create a favorites deck using `config.favorites.length > 0 ? config.favorites : DEFAULT_FAVORITES`. Always add favorites button at position 0, shift categories to positions 1..N.

Add at top of file (after existing constants):
```ts
const DEFAULT_FAVORITES = ["❤️", "🔥", "⭐", "😂", "👍", "🎉", "💯", "✨", "🙏", "👑"]
```

Rewrite `generateDecks` body:
1. `const favorites = config.favorites.length > 0 ? config.favorites : DEFAULT_FAVORITES`
2. Always build favorites deck: `decks[favoritesDeckId] = buildEmojiDeck(FAVORITES.label, favorites)`
3. Always push favorites button at position 0
4. Categories at `position: idx + 1`
5. Remove the `hasFavorites` conditional branches entirely

### Task 2: Fix launcher default label to "Emojis"
**Files:** `packages/cli/src/builtin-addons/emoji-selector/support.ts`
**Depends on:** None

Change line 17: `.default("Emoji")` → `.default("Emojis")`

One word change. The frontend already renders `config.label`.

### Task 3: Update decks tests for always-on favorites
**Files:** `packages/cli/src/builtin-addons/emoji-selector/__tests__/decks.test.ts`
**Depends on:** Task 1

Current tests assert no favorites deck/button when empty — these must be inverted. Update the test suite:

1. **"emits a favorites deck with DEFAULT_FAVORITES when favorites is empty"** — `decks["emoji-selector-favorites"]` is defined, has 10 buttons, `paginated: true`
2. **"includes Favorites entry at position 0 when favorites is empty"** — top button is Favorites, position 0, icon ⭐, target_deck routes to base deck (10 < 13, single page)
3. **"category buttons start at position 1 when favorites is empty"** — Smileys at position 1, Flags at position 8, total 9 buttons
4. Keep existing tests for non-empty favorites (lines 39-68) — they still pass since behavior for non-empty favorites is unchanged

### Task 4: Verify pagination renders on emoji list decks
**Files:** None (investigation + optional fix)
**Depends on:** Task 1

The `paginateDeck` → `paginate` → `core:page-nav` pipeline looks correct in code (research confirmed). Verify it works end-to-end:

1. Run the app, navigate to any category with >13 emojis (all categories qualify)
2. Confirm page-nav button appears at position 13 with tap=next, hold=prev
3. Confirm page indicator shows correct page numbers

If page-nav does NOT render, the likely cause is cross-addon frontend resolution (the `core:page-nav` frontend registered by core addon not found when resolving buttons in emoji-selector decks). Fix would be in the frontend button type resolver — ensure it searches all registered addons, not just the deck's owning addon.

This task is investigative. If the code path works, no changes needed. If it doesn't, add a fix and document the root cause.

## Verification
1. `pnpm test` in `packages/cli` — all tests pass with updated favorites behavior
2. `pnpm typecheck` — no type errors
3. Visual: category-list shows 9 entries (Favorites + 8 categories) when config has no favorites
4. Visual: launcher button shows "Emojis" text
5. Visual: tapping a category shows page-nav at position 13 for multi-page categories
