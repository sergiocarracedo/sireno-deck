# Phase 46 Research: Emoji-Selector Multi-Page

## Don't Hand-Roll: Emoji Data Source

- **Don't embed emoji data manually** — there are well-maintained npm packages (`node-emoji`, `emoji-data`, `@unicode/unicode-emoji-json`) that provide structured emoji datasets by category
- **Recommendation**: Use `node-emoji` (most popular, 40M+ weekly downloads, TypeScript types available). It provides `getCategories()` which returns categorized arrays like `{ name: 'Smileys & Emotion', emoji: '😀', slug: 'smileys-and-emotion' }`. Alternatively, bundle a subset as JSON if we want zero-dependency.
- **Fallback**: Bundle a hand-picked `emoji.json` with the addon's assets for the common emoji set (categories that fit Stream Deck button counts). No network dependency, fully offline.

## Common Pitfalls

- **`keyCount` isn't available in `createDecks`**: The `AddonDeckEnvelope` type only carries `{ id, type }`. The current code hardcodes `position: 14` (15-key assumption). For pagination, we need page size — which depends on keyCount. Options: hardcode 15 (consistent with existing code), or extend the envelope (API change).
- **Page size differs by page index**: Page 1 has `keyCount - 1` slots (no prev button needed), subsequent pages have `keyCount - 2` slots (prev + next take 2 slots). The `createDecks` function must compute differently per page.
- **Reserved slot collision**: The runtime injects a system back button at `keyCount - 1` for sub-decks without a button there. We must be explicit about which pages get Next (occupying that slot) vs leaving it free for system back (pages 1 and last page).
- **Edge case: exact fit**: If a category fills exactly one page, no nav buttons should appear. Same behavior as current single-page.

## Existing Patterns in This Codebase

- **`change-deck` button type** (`packages/cli/src/builtin-addons/system-buttons/change-deck.tsx`): Uses `navigateToDeck(config.target_deck)`. Already registered and usable in any addon. Set `type: 'change-deck'` with `target_deck` and config.
- **System back injection** (`packages/cli/src/deck/system-back-injection.ts`): Runtime injects back button at `keyCount - 1` for sub-decks. Checks: if a button already exists at that position, skip injection.
- **`AddonGeneratedDeck`**: Interface with `{ id, name?, background?, buttons: AddonGeneratedButton[] }`. No keyCount field.
- **`AddonDeckEnvelope`**: Only `{ id, type }`. No keyCount.
- **Current emoji-selector**: Hardcodes `position: 14` for back button. Creates 1 deck per category + 1 main deck. 3 categories, 4 emojis each.

## Recommended Approach

1. **Emoji data**: Bundle a `emoji-data.ts` file with expanded emoji arrays per category (hand-picked ~60 commonly-used emojis across 5-7 categories). No npm dependency. Keep it simple.
2. **Page size**: Hardcode 15 (consistent with existing code). Extract as a constant `DEFAULT_KEY_COUNT = 15` in `support.tsx`. If we later extend the envelope, we can make this dynamic.
3. **Pagination**: Write a `paginateEmojis(emojis, pageSize)` utility that splits an array into page chunks. Page 1 gets `pageSize - 1` items; subsequent pages get `pageSize - 2` items.
4. **Deck generation**: For each category with emojis, generate N page decks. Each page deck has:
   - Page 1: emojis at slots 0..pageSize-2, no prev/next (system back at keyCount-1)
   - Middle pages: prev at slot 0, emojis at slots 1..pageSize-1, next at keyCount-1
   - Last page: prev at slot 0, emojis at slots 1..pageSize-1, system back at keyCount-1
5. **Navigation**: Use `type: 'change-deck'` for prev/next buttons. Page indicator via the category button's label (hardcoded in the deck, not dynamic).
