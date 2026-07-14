# Roadmap: Emoji-Selector Fixes + Paste Command

## Requirements Coverage Matrix

| Req ID | Description | Phase | Status |
|--------|-------------|-------|--------|
| REQ-001 | `paste://` writes to clipboard AND simulates paste keystroke | P1 | planned |
| REQ-002 | `paste://` unit tests verify both clipboard write + keystroke | P1 | planned |
| REQ-003 | Create `data/categories.json` with 10 categories from old repo | P2 | planned |
| REQ-004 | Update `support.ts` to load categories from JSON | P2 | planned |
| REQ-005 | Category icons use real emoji characters | P2 | planned |
| REQ-006 | Category-list deck uses core's `paginateDeck` | P2 | planned |
| REQ-007 | Favorites category always shown, defaults to 10 popular emojis | P3 | planned |
| REQ-008 | Launcher button renders "Emojis" text label | P3 | planned |
| REQ-009 | Emoji list decks render `core:page-nav` pagination buttons | P3 | planned |
| REQ-010 | Pagination nav buttons visually functional on emoji list decks | P3 | planned |

---

## Phase 1: paste:// Fix

**Goal:** `paste://` text is written to the clipboard AND pasted into the active application via keystroke simulation.

**Depends on:** None
**Blocks:** None
**Status:** planned

### Success Criteria

- [ ] `pasteText()` calls `clipboardProvider.writeText(text)` then `keyMacroProvider.sendKey("ctrl+v")`
- [ ] `keyMacroProvider` is optional — if unavailable, clipboard write still succeeds (graceful degradation)
- [ ] `dispatch("paste://🔥")` triggers both clipboard write and keystroke
- [ ] All existing tests pass unchanged
- [ ] New tests verify: (a) both providers called, (b) missing keyMacroProvider degrades gracefully, (c) emoji text round-trips correctly

### Tasks

- [ ] T1.1: Add `keyMacroProvider.sendKey("ctrl+v")` after `clipboardProvider.writeText()` in `pasteText()`, gated on `keyMacroProvider !== undefined` — `packages/cli/src/deck/methods.ts`
- [ ] T1.2: Add unit tests for paste+keystroke, graceful degradation, and emoji passthrough — `packages/cli/src/deck/__tests__/methods.test.ts`

### Must-Haves

- Sequential `await` — clipboard write completes before keystroke fires
- `ctrl+v` as the universal combo (platform providers handle mapping)
- No changes to clipboard or key-macro provider implementations

### Nice-to-Haves

- Error logging if `sendKey()` fails after successful clipboard write

---

## Phase 2: Categories Data Layer

**Goal:** Emoji-selector loads categories from a JSON file, uses real emoji icons, and integrates with core pagination.

**Depends on:** None
**Blocks:** P3
**Status:** planned

### Success Criteria

- [ ] `data/categories.json` exists with 10 categories, each having `{ char, shortcode }` emoji entries
- [ ] `support.ts` imports from JSON, exports typed `loadCategories()` function
- [ ] `EmojiCategorySpec` interface matches JSON structure
- [ ] Category icons render as real emoji characters (not `addon://` SVG URLs)
- [ ] Category-list deck sets `paginated: true` and delegates to `paginateDeck()`
- [ ] TypeScript compiles with `resolveJsonModule: true` in tsconfig

### Tasks

- [ ] T2.1: Create `data/categories.json` — 10 categories (smileys, people, animals, nature, food, drink, activities, travel, objects, symbols, flags) with emoji data migrated from old repo — `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`
- [ ] T2.2: Update `support.ts` — import from JSON, define `loadCategories()`, update `EmojiCategorySpec` — `packages/cli/src/builtin-addons/emoji-selector/support.ts`
- [ ] T2.3: Verify `resolveJsonModule: true` in tsconfig, add if missing — `tsconfig.base.json`
- [ ] T2.4: Update category deck generation to use `loadCategories()` and set `paginated: true` — `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`

### Must-Haves

- All 10 categories present with correct emoji data
- Named exports only, no default exports
- Zod validation with `.strict()` on any new schemas

### Nice-to-Haves

- Category ordering matches the canonical emoji standard order

---

## Phase 3: Favorites + Launcher + Pagination Polish

**Goal:** Favorites always visible, launcher shows proper label, pagination nav buttons render on emoji list decks.

**Depends on:** P2
**Blocks:** None
**Status:** planned

### Success Criteria

- [ ] Favorites category appears as first entry in category-list deck
- [ ] When `config.favorites` is empty, 10 default emojis are shown (❤️ 🔥 ⭐ 😂 👍 🎉 💯 ✨ 🙏 👑)
- [ ] Launcher button renders "Emojis" text label
- [ ] Selecting a category shows emoji list deck with working `core:page-nav` buttons
- [ ] Page-nav next/prev cycles through emoji pages correctly

### Tasks

- [ ] T3.1: Remove `hasFavorites` guard, always add favorites deck at position 0 with `DEFAULT_FAVORITES` fallback — `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`
- [ ] T3.2: Fix launcher button to render "Emojis" text label — `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher/frontend.tsx` (and `config.ts` if default label is the issue)
- [ ] T3.3: Investigate and fix `core:page-nav` rendering on emoji list decks — check position conflicts, button registration, frontend rendering — `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts`, core pagination frontend
- [ ] T3.4: Manual verification — navigate full flow on Stream Deck hardware/simulator

### Must-Haves

- Favorites visible without user configuration
- Launcher shows readable text label
- Pagination nav buttons appear and function on emoji list decks

### Nice-to-Haves

- Favorites deck shows a "star" or heart icon on the category button

---

## Verification Points

| Phase | What to verify | How |
|-------|---------------|-----|
| P1 | pasteText() calls both providers | Unit test: mock both providers, assert `sendKey("ctrl+v")` called after `writeText()` |
| P1 | Graceful degradation without keyMacroProvider | Unit test: omit keyMacroProvider, assert `writeText()` still called, no throw |
| P1 | Emoji round-trip through paste | Unit test: `dispatch("paste://🔥")` calls `writeText("🔥")` |
| P2 | JSON loads correctly | `loadCategories()` returns 10 categories with emoji arrays |
| P2 | TypeScript compiles | `tsc --noEmit` passes with JSON import |
| P2 | Category icons are real emoji | Visual check: category buttons show emoji, not broken images |
| P2 | Pagination wired | Category deck has `paginated: true`, `paginateDeck()` called during generation |
| P3 | Favorites always shown | Category list starts with favorites even when config has empty array |
| P3 | Launcher label | Launcher button shows "Emojis" text |
| P3 | Page-nav visible | Emoji list decks show page-nav button at position 13 |
| P3 | End-to-end paste | Tap emoji → clipboard has emoji + emoji appears in target app |

## Dependencies Graph

```
P1 (paste:// fix)          P2 (categories.json)
    independent                independent
        │                          │
        │                          ▼
        │                    P3 (favorites + polish)
        │                          │
        └──────────────────────────┘
                 P1 and P2 are
                 independent of
                 each other; both
                 feed into P3
```

P1 and P2 have **zero dependency** on each other — they can be worked in parallel or either first. P3 depends on P2 (favorites and pagination use the new data layer) but not on P1.
