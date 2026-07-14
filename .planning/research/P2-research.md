# P2 Research: Categories Data Layer

**Researched:** 2026-07-14
**Phase goal:** Emoji-selector loads categories from a JSON file, uses real emoji icons, and integrates with core pagination.

## Implementation Approach

### T2.1: Create `data/categories.json`

**Location:** `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`

**Critical finding:** The current `CATEGORY_DEFINITIONS` has **8 categories** (smileys, nature, food, activities, travel, objects, symbols, flags). The ROADMAP lists **10** — the two missing are **people** and **drink**. These must be sourced from the old `sireno-deck` repo or created fresh.

**JSON structure — keep `readonly string[]` for emojis, NOT `{ char, shortcode }`:**

The ROADMAP says `{ char, shortcode }` per emoji, but the codebase uses emoji strings everywhere (`paste://${emoji}`, `label: emoji`). Changing to `{ char, shortcode }` requires updating `EmojiCategorySpec`, `buildEmojiDeck`, the paste action template, and every test — all for a `shortcode` field that nothing reads. **Keep `emojis: readonly string[]`** in the JSON. Shortcodes can be added later if needed.

```json
{
  "categories": [
    {
      "id": "smileys",
      "label": "Smileys",
      "icon": "\ud83d\ude04",
      "emojis": ["\ud83d\ude00", "\ud83d\ude03", "..."]
    }
  ]
}
```

### T2.2: Update `support.ts`

- Import JSON using the import attributes syntax the codebase already uses: `import categoriesData from "./data/categories.json" with { type: "json" }`
- Define a `loadCategories()` function that returns typed data
- Export `loadCategories` (named export only, per constraints)
- `EmojiCategorySpec` stays as-is — the `emojis: readonly string[]` field matches the JSON structure

```typescript
import categoriesData from "./data/categories.json" with { type: "json" }

export const loadCategories = (): readonly EmojiCategorySpec[] =>
  categoriesData.categories
```

**Keep `CATEGORY_DEFINITIONS` temporarily** as a re-export from `loadCategories()` during migration, then delete once all callers are updated. Or just change the import in `decks/index.ts` in the same commit.

### T2.3: `resolveJsonModule` — ALREADY DONE

`tsconfig.base.json` line 20: `"resolveJsonModule": true`. **T2.3 is a no-op.** The planner should skip this task or note it's already satisfied.

### T2.4: Category deck uses `paginateDeck`

**The category-list deck** (`decks[deck.id]` at line 83 of `decks/index.ts`) currently has no `paginated: true`. This is the one line that needs adding:

```typescript
decks[deck.id] = {
  name: "Emoji Selector",
  buttons: topButtons,
  paginated: true,  // ← add this
}
```

**Why this works:** `mapAddonDeckToRuntimeDeck` in `addon-decks.ts` already checks `gdeck.paginated === true` and calls `paginateDeck()` when it's set. The buttons array (`topButtons`) contains objects with `{ type, icon, label, position, target_deck }` — `paginateDeck` treats them as opaque items and re-indexes positions. No structural change needed.

**Emoji sub-decks** already have `paginated: true` via `buildEmojiDeck` (line 29). No change needed there.

## Pitfalls

1. **Tests assert exactly 8 categories** — `decks.test.ts` lines 31-37 assert 8 buttons, and lines 77-84 assert 8 specific category deck IDs. After adding "people" and "drink", these assertions break. Fix: update expected counts and add the two new deck IDs to the assertion.

2. **Position offsets shift when category count changes** — With 10 categories + optional favorites, positions go 0..10 (11 total). Tests at line 56 assert `[0,1,2,3,4,5,6,7,8]` for favorites-present case (9 items). This becomes `[0..10]` (11 items). **Update all position assertions.**

3. **`target_deck` routing assumes paginated state** — The current code manually computes `target_deck` with `-p1` suffix when `totalPages > 1` (lines 63, 79). After setting `paginated: true` on the category-list deck, `paginateDeck` will generate page-suffixed deck IDs (e.g., `emoji-selector-p1`). The category buttons' `target_deck` values must match these generated IDs. **Risk:** If `paginateDeck` produces different IDs than the hand-computed ones, category navigation breaks. Verify that the generated deck IDs match the `target_deck` values in the buttons.

4. **Import attributes syntax in non-test files** — The existing JSON import (`import manifestJson from "../sirenodeck.json" with { type: "json" }`) is in a test file. Verify it also works in production source code with the project's bundler config. If it doesn't, fall back to a build-time codegen or manual type assertion.

5. **`data/` directory doesn't exist yet** — Must be created. The path `packages/cli/src/builtin-addons/emoji-selector/data/` needs to exist before the JSON import resolves.

## Existing Patterns

- **JSON import syntax:** `import manifestJson from "../sirenodeck.json" with { type: "json" }` — used in `internal-settings/__tests__/index.test.ts`. Use this same import attributes syntax.
- **`paginateDeck` integration:** `mapAddonDeckToRuntimeDeck` in `addon-decks.ts` already handles `paginated: true` — just set the flag, the plumbing is there.
- **Named exports only:** `support.ts` uses named exports. `decks/index.ts` re-exports named. Follow this.
- **Zod `.strict()`:** `EmojiLauncherButtonSchema` and `EmojiSelectorDeckSchema` both use `.strict()`. If adding a new schema for the JSON data, use `.strict()`.

## Data Structure

**Final JSON for `categories.json`:**

```json
{
  "categories": [
    {
      "id": "smileys",
      "label": "Smileys",
      "icon": "😀",
      "emojis": ["😀", "😃", "😄", "..."]
    },
    {
      "id": "people",
      "label": "People",
      "icon": "👋",
      "emojis": ["👋", "🤚", "🖐", "..."]
    },
    {
      "id": "nature",
      "label": "Nature",
      "icon": "🌿",
      "emojis": ["🌲", "🌳", "🌴", "..."]
    },
    {
      "id": "food",
      "label": "Food",
      "icon": "🍕",
      "emojis": ["🍏", "🍎", "🍐", "..."]
    },
    {
      "id": "drink",
      "label": "Drink",
      "icon": "☕",
      "emojis": ["☕", "🍵", "🍶", "..."]
    },
    {
      "id": "activities",
      "label": "Activities",
      "icon": "⚽",
      "emojis": ["⚽", "🏀", "🏈", "..."]
    },
    {
      "id": "travel",
      "label": "Travel",
      "icon": "✈️",
      "emojis": ["🚗", "🚕", "🚙", "..."]
    },
    {
      "id": "objects",
      "label": "Objects",
      "icon": "💡",
      "emojis": ["⌚", "📱", "💻", "..."]
    },
    {
      "id": "symbols",
      "label": "Symbols",
      "icon": "❤️",
      "emojis": ["❤️", "🧡", "💛", "..."]
    },
    {
      "id": "flags",
      "label": "Flags",
      "icon": "🏁",
      "emojis": ["🏁", "🚩", "🎌", "..."]
    }
  ]
}
```

**TypeScript type (for `support.ts`):**

```typescript
interface CategoryData {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly emojis: readonly string[]
}

interface CategoriesFile {
  readonly categories: readonly CategoryData[]
}
```

This aligns with the existing `EmojiCategorySpec` — in fact, `CategoryData` IS `EmojiCategorySpec`, so the existing interface can be reused directly.

## Verification

1. **TypeScript compiles:** `npx tsc --noEmit` passes with the JSON import
2. **Unit tests pass:** `decks.test.ts` updated to expect 10 categories, all assertions adjusted for new counts
3. **`loadCategories()` returns 10 items:** Simple test that calls `loadCategories()` and asserts length + IDs
4. **Category icons are real emoji:** Visual check — category buttons show emoji characters, not broken images or `addon://` URLs
5. **Category-list deck is paginated:** Assert `decks["emoji-selector"].paginated === true` in tests
6. **Pagination routing works:** Assert that selecting a category navigates to the correct paginated deck (e.g., `emoji-selector-smileys-p1` for categories with >13 emojis)
