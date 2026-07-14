# P3 Research: Favorites + Pagination Polish

## Implementation Approach

### T3.1: Favorites Always Shown

**Current state:** `decks/index.ts` lines 37-65 gate favorites on `config.favorites.length > 0`. When empty, no favorites deck or button is created.

**Change:** Remove the `hasFavorites` guard. Always:
1. Create a favorites deck with `config.favorites.length > 0 ? config.favorites : DEFAULT_FAVORITES`
2. Add favorites button at position 0
3. Shift all category buttons by +1

**Sketch:**
```typescript
const DEFAULT_FAVORITES = ["❤️", "🔥", "⭐", "😂", "👍", "🎉", "💯", "✨", "🙏", "👑"]

const generateDecks = (deck, config) => {
  const favorites = config.favorites.length > 0 ? config.favorites : DEFAULT_FAVORITES

  // Always create favorites deck
  const favoritesDeckId = buildCategoryDeckId(deck.id, FAVORITES.id)
  decks[favoritesDeckId] = buildEmojiDeck(FAVORITES.label, favorites)

  // Always add favorites button at position 0
  const totalPages = Math.max(1, Math.ceil(favorites.length / EMOJI_PAGE_SIZE))
  topButtons.push({
    type: "emoji-selector:category",
    icon: FAVORITES.icon,
    label: FAVORITES.label,
    position: 0,
    target_deck: totalPages > 1 ? `${favoritesDeckId}-p1` : favoritesDeckId,
  })

  // Categories at positions 1..N
  CATEGORY_DEFINITIONS.forEach((category, idx) => { ... position: idx + 1 ... })
}
```

**Test updates needed:** The existing tests assert favorites is absent when empty. These must be inverted to assert favorites uses DEFAULT_FAVORITES when empty.

### T3.2: Launcher Label "Emojis"

**Current state:** `support.ts` line 17 has `z.string().min(1).default("Emoji")` (singular). The frontend renders `config.label` inside a `<Label>` component, so the label IS shown — the default is just wrong.

**Fix:** Change the default from `"Emoji"` to `"Emojis"` in `EmojiLauncherButtonSchema`:
```typescript
label: z.string().min(1).default("Emojis"),
```

That's it — one word change. The frontend already renders it.

### T3.3: Pagination Investigation

**Why nav buttons SHOULD render (code analysis):**

1. `buildEmojiDeck` sets `paginated: true` on every emoji deck
2. `mapAddonDeckToRuntimeDeck` (addon-decks.ts:34) calls `paginateDeck()` when `paginated === true`
3. `paginateDeck` calls `paginate()` from `@/core/pagination`, which splits items into pages of size `keyCount - 2` (13 for 15-key device)
4. For multi-page decks, `paginateDeck` inserts `core:page-nav` buttons at position `keyCount - 2` (position 13)
5. `core:page-nav` is registered in the core addon with both frontend (`PageNavButtonFrontend`) and backend (`pageNavBackend`) — gestureHandlers: tap, hold
6. The runtime deck button gets `config: { currentPage, totalPages, prevDeckId, nextDeckId }` which the frontend reads

**The code path looks correct.** If page-nav buttons truly don't render, the likely causes are:

- **Button type resolution across addons:** The emoji-selector addon's generated decks reference `core:page-nav`, which is registered by the core addon. If the frontend resolution only looks up button types from the same addon, page-nav would fail silently. Check how the frontend resolves button types — does it search across all registered addons?
- **`paginateDeck` not called:** Verify that `materializeAddonDecks` actually calls `mapAddonDeckToRuntimeDeck` for emoji-selector decks. The `internal` flag on the deck definition shouldn't prevent this since `materializeAddonDecks` skips `internal` deck *types* but not generated decks.
- **Position collision:** If something else puts a button at position 13, the page-nav gets spliced out (paginate-deck.ts:53-58 removes existing buttons at that position). This is actually a feature, not a bug.

**Recommendation:** The code looks correct. Add a `console.log` in `paginateDeck` to verify it's called and produces page-nav buttons. If it is called and produces them, the issue is in frontend resolution. If it's not called, trace back from `materializeAddonDecks`.

## Pitfalls

1. **Test regression on favorites:** Existing tests (decks.test.ts lines 21-37) assert no favorites deck/button when empty. All must be updated to assert DEFAULT_FAVORITES behavior. Missing this breaks the test suite.

2. **DEFAULT_FAVORITES length vs pagination:** The 10 default favorites fit on one page (10 < 13), so no page-nav needed for the favorites deck. But if a user adds >13 favorites, page-nav kicks in. The `target_deck` routing must use `-p1` suffix when paginated (already handled in the current code for categories — reuse the same pattern).

3. **Launcher default change breaks existing configs:** Changing `"Emoji"` → `"Emojis"` only affects NEW configs (the `.default()` is used when the field is absent). Existing users who never set a label will see the new default on next deck generation. This is the intended behavior per the ROADMAP.

4. **`paginateDeck` marker splice:** The splice at line 53-58 removes existing buttons at `pageNavPosition`. If a category button somehow lands at position 13, it gets silently removed. Not a risk here since category buttons use positions 0-N, but worth knowing.

## Existing Patterns

- **`buildEmojiDeck`:** Reuse this helper for favorites — it already sets `paginated: true` and creates correct button structure (decks/index.ts:20-30)
- **`buildCategoryDeckId`:** Already used for category routing (decks/index.ts:17-18) — use for favorites deck ID too
- **`paginateDeck` + `paginate`:** Core pagination system — don't reinvent. Used by category decks, same pattern applies to favorites
- **`EmojiSelectorDeckSchema` defaults:** Zod `.default([])` pattern for favorites — extend, don't replace
- **Test pattern:** decks.test.ts uses `createDeck()` and `topButtons()` helpers — reuse for favorites tests

## Favorites Default Data

Exact 10 emojis (from ROADMAP success criteria):

```
❤️ 🔥 ⭐ 😂 👍 🎉 💯 ✨ 🙏 👑
```

As a const array:
```typescript
const DEFAULT_FAVORITES = ["❤️", "🔥", "⭐", "😂", "👍", "🎉", "💯", "✨", "🙏", "👑"] as const
```

Note: This is a subset/overlap with `EMOJI_LAUNCHER_GRID` (😂 🔥 ❤️ ⭐ 🍕 🎵) — the launcher grid is the 3x2 visual preview, not the favorites list.

## Pagination Investigation

**Root cause analysis:**

The `paginateDeck` → `paginate` → `core:page-nav` pipeline looks correct in the code. The most likely reasons page-nav buttons might not render in practice:

1. **Cross-addon frontend resolution:** The `core:page-nav` frontend is registered by the core addon, but the button appears in emoji-selector decks. If the UI framework only resolves button types from the owning addon's registry, page-nav would silently fail. **Verify by:** checking how the frontend resolves `type → component` — does it search all addons or just the deck's addon?

2. **`paginated: true` not reaching `mapAddonDeckToRuntimeDeck`:** The `createDecks` function returns decks with `paginated: true`, but if something strips it before `materializeAddonDecks` processes it, pagination wouldn't trigger. **Verify by:** logging `gdeck.paginated` in `mapAddonDeckToRuntimeDeck`.

3. **`keyCount` too high:** If `keyCount` is set to a value where `pageSize >= total items`, no pagination occurs. With keyCount=15, pageSize=13. Categories have 36 emojis → 3 pages. This should work.

**If page-nav genuinely doesn't render:** The fix is likely in the frontend button resolution, not in the deck generation. The deck generation correctly produces `core:page-nav` buttons.

## Verification

- **Favorites:** Run deck generation, confirm `emoji-selector-favorites` deck exists with 10 default emojis, favorites button appears at position 0
- **Launcher:** Open launcher button config, confirm default label is "Emojis" (not "Emoji")
- **Pagination:** Open any category with >13 emojis (all of them), confirm page-nav button appears at position 13 with tap=next/hold=prev
- **End-to-end:** Navigate category → emoji page → tap emoji → verify paste dispatches `paste://<emoji>`
- **Tests:** `vitest run` passes after test updates for new favorites behavior
