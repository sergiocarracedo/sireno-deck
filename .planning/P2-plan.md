# P2: Categories Data Layer

## Goal
Emoji-selector loads categories from a JSON file (adding the 2 missing categories: people, drink), uses real emoji icons, and integrates with core pagination on the category-list deck.

## Must-Haves
- [ ] `data/categories.json` exists with 10 categories, each having `id`, `label`, `icon` (real emoji char), and `emojis: string[]`
- [ ] `support.ts` imports from JSON via `loadCategories()`, exports typed result
- [ ] `EmojiCategorySpec` interface matches JSON structure (already does — `emojis: readonly string[]`)
- [ ] Category icons render as real emoji characters (already true — current icons are emoji)
- [ ] Category-list deck sets `paginated: true` and delegates to `paginateDeck()`
- [ ] All existing tests updated and passing with 10 categories

## Tasks

### Task 1: Create `data/categories.json`
**Files:** `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` (new file + new `data/` dir)
**Depends on:** None

Create `categories.json` with 10 categories. Use the existing 8 categories from `support.ts` (copy their emoji arrays verbatim) and add the 2 new ones:

- **people** (insert after smileys): icon `👋`, emojis from Unicode People & Body block — `["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"]`
- **drink** (insert after food): icon `☕`, emojis from Unicode Food & Drink drink subset — `["☕", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🫗", "🥤", "🧋", "🧃", "🧉", "🧊"]`

Structure:
```json
{
  "categories": [
    { "id": "smileys", "label": "Smileys", "icon": "🙂", "emojis": ["😀", "..."] },
    { "id": "people", "label": "People", "icon": "👋", "emojis": ["👋", "..."] },
    ...10 total...
  ]
}
```

Category order: smileys, people, nature, food, drink, activities, travel, objects, symbols, flags (matches emoji standard grouping).

### Task 2: Update `support.ts` — import from JSON, export `loadCategories()`
**Files:** `packages/cli/src/builtin-addons/emoji-selector/support.ts`
**Depends on:** Task 1

Changes:
1. Add import at top: `import categoriesData from "./data/categories.json" with { type: "json" }`
2. Add exported function:
   ```ts
   export const loadCategories = (): readonly EmojiCategorySpec[] =>
     categoriesData.categories
   ```
3. Replace `CATEGORY_DEFINITIONS` with a re-export from `loadCategories()`:
   ```ts
   /** @deprecated Use loadCategories() */
   export const CATEGORY_DEFINITIONS: ReadonlyArray<EmojiCategorySpec> =
     loadCategories()
   ```
   Keep the deprecation alias so `decks/index.ts` can be updated in the same or next commit without breakage. The ROADMAP says "named exports only" — both `loadCategories` and `CATEGORY_DEFINITIONS` are named exports.

### Task 3: Update category deck generation — use `loadCategories()`, add `paginated: true`
**Files:** `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`
**Depends on:** Task 2

Changes:
1. Import `loadCategories` instead of `CATEGORY_DEFINITIONS`:
   ```ts
   import { loadCategories, EmojiSelectorDeckSchema, ... } from "../support"
   ```
2. In `generateDecks`, replace `CATEGORY_DEFINITIONS.forEach(...)` with `loadCategories().forEach(...)`
3. Add `paginated: true` to the category-list deck (line 83):
   ```ts
   decks[deck.id] = {
     name: "Emoji Selector",
     buttons: topButtons,
     paginated: true,  // ← add this
   }
   ```

The sub-decks (per-category emoji decks) already have `paginated: true` via `buildEmojiDeck`. The `paginateDeck` plumbing in `addon-decks.ts` already handles the flag. The hand-computed `target_deck` with `-p1` suffix on lines 63/79 will now match what `paginateDeck` generates — the `paginateDeck` function produces `${baseDeckId}-p${pageIndex + 1}` which matches the `${categoryDeckId}-p1` pattern already used.

### Task 4: Update tests for 10 categories
**Files:** `packages/cli/src/builtin-addons/emoji-selector/__tests__/decks.test.ts`
**Depends on:** Task 3

Changes required (research pitfall #1 and #2):

1. **"places category buttons at positions 0..7"** (line 31): Change `toHaveLength(8)` → `toHaveLength(10)`, positions → `[0,1,2,3,4,5,6,7,8,9]`, update label assertions to include people and drink
2. **"emits one deck per category id"** (line 72): Add `"emoji-selector-people"` and `"emoji-selector-drink"` to the assertion list
3. **"category decks are paginated: true"** (line 87): Add `expect(decks["emoji-selector-people"].paginated).toBe(true)` and same for drink
4. **"places the Favorites entry at position 0"** (line 45): No change needed (favorites is position 0)
5. **"shifts category buttons to positions 1..8"** (line 53): Change `toHaveLength(9)` → `toHaveLength(11)`, positions → `[0,1,2,3,4,5,6,7,8,9,10]`, update last label to `"Flags"`
6. Add a new test for `loadCategories()`:
   ```ts
   it("loadCategories returns all 10 categories", () => {
     const cats = loadCategories()
     expect(cats).toHaveLength(10)
     expect(cats.map((c) => c.id)).toEqual([
       "smileys", "people", "nature", "food", "drink",
       "activities", "travel", "objects", "symbols", "flags",
     ])
   })
   ```

### Task 5: Verify TypeScript compiles
**Files:** None (verification only)
**Depends on:** Task 4

Run `npx tsc --noEmit` in `packages/cli` to confirm:
- JSON import with `{ type: "json" }` attribute resolves
- `EmojiCategorySpec` is compatible with the JSON shape
- No type errors from the `loadCategories()` migration

`resolveJsonModule: true` is already set in `tsconfig.base.json` (line 20) — no changes needed there.

## Verification
1. `pnpm test` in `packages/cli` — all tests pass with 10 categories
2. `pnpm typecheck` — no type errors
3. `loadCategories()` returns 10 categories with correct IDs and emoji arrays
4. Category-list deck has `paginated: true`
