# PROJECT.md — sireno-deck-2: Emoji-Selector Fixes + Paste Command

## What are we building?

Fix bugs and add missing features to the emoji-selector builtin addon, and fix the core `paste://` command to actually paste into the active application.

## Feature Areas

### 1. Emoji-Selector Addon Fixes

**Launcher button:**
- Render the UI label "Emojis" as the title (currently shows a 6-emoji grid without a text label)

**Category-list deck (routing deck):**
- Show a **favorites** category button as the first entry
- Favorites come from the launcher button config schema (`favorites` array)
- If favorites array is empty, default to 10 globally popular emojis
- Categories and emojis must come from `data/categories.json` (new file, migrated from old `sireno-deck` repo)
- Category icons must use **real emoji characters** (not SVG `addon://` URLs)
- The deck must be paginated using the **core's pagination system** (`paginateDeck`), not custom pagination

**Category emojis list deck:**
- Must render the core's pagination nav buttons (`core:page-nav`)
- Currently broken — pagination nav buttons don't appear

**Data migration:**
- Create `data/categories.json` with 10 categories from old repo: smileys, people, animals, nature, food, drink, activities, travel, objects, symbols, flags
- Each emoji has `{ char, shortcode }` structure
- Update `support.ts` to load from JSON instead of hardcoded arrays
- Update `EmojiCategorySpec` interface if needed

### 2. Core paste:// Command

**Current state:** `paste://<text>` writes to clipboard only — no keystroke simulation.

**Required behavior:**
1. Write text to clipboard via `ClipboardProvider.writeText()`
2. Simulate paste keystroke (Ctrl+V on Linux/Windows, Cmd+V on macOS)
3. Must be testable — unit tests verify both clipboard write and keystroke dispatch

**Clipboard provider requirements:**
- OS-agnostic interface (`ClipboardProvider`)
- Per-OS implementations (Linux, Darwin, Windows) using the same shape
- Core and addons must NOT know about the OS — just use the provider
- Paste keystroke simulation should be part of the clipboard provider or a separate paste provider

## Constraints

- **No custom pagination** in the addon — use core's `paginateDeck`
- **No OS-specific code** in core — clipboard/paste providers are injected
- **Zod validation** with `.strict()` for all config schemas
- **Named exports only**, no default exports for new logic
- **No `.refine()`** on Zod schemas
- **Vitest** for testing (node default environment)
- **ponytail mode** active — shortest working solution

## Verification Strategy

- **Manual:** Run the Stream Deck CLI, navigate to emoji selector, verify:
  - Launcher shows "Emojis" label
  - Favorites category appears first in category list
  - All 10 categories from categories.json are shown
  - Category icons are real emoji
  - Pagination works on category list and emoji pages
  - Tapping an emoji pastes it into the active app (clipboard + keystroke)
- **Automated:** Unit tests for:
  - `pasteText()` calls clipboard provider AND dispatches keystroke
  - Category loading from JSON
  - Favorites fallback to default emojis
  - Pagination integration with core's `paginateDeck`
