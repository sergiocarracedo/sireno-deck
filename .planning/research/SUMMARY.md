# Research Summary — Emoji-Selector Fixes + Paste Command

**Researched:** 2026-07-14

---

## 1. Architecture Analysis

### Emoji-Selector Addon — End-to-End Flow

**Entry:** `sirenodeck.json` → `index.ts` (apiVersion: 1, entry: `index.ts`)

**Manifest registers 3 button types + 1 deck factory:**
- `emoji-selector:launcher` — tap → navigates to `emoji-selector` deck
- `emoji-selector:category` — tap → navigates to category emoji deck (e.g. `emoji-selector-smileys-p1`)
- `emoji-selector:emoji` — no gesture handlers; relies on `actions.tap = paste://<emoji>` dispatch
- Deck factory `emoji-selector:emoji-selector` → `createDecks()` generates all decks

**Deck generation (`decks/index.ts` → `generateDecks()`):**
1. Builds category routing deck (`emoji-selector`) with category buttons
2. Builds per-category emoji list decks (`emoji-selector-smileys`, etc.) with `paginated: true`
3. Builds favorites deck if `config.favorites.length > 0`
4. Category buttons get `target_deck` pointing to first page of category emoji deck

**Data flow when user taps emoji:**
1. Frontend sends `button-action` WS message with position
2. Runtime `dispatchGesture()` → `invokeAction()` checks for `actions.tap`
3. `actions.tap = "paste://🔥"` → `methods.dispatch("paste://🔥")`
4. `dispatch()` strips `paste://` prefix → calls `pasteText("🔥")`
5. `pasteText()` calls `clipboardProvider.writeText("🔥")` ← **currently stops here**

**Current `paste://` gap:** No keystroke simulation after clipboard write. Text sits in clipboard but never reaches the target application.

### Pagination Architecture

**Core pagination (`core/pagination.ts`):**
- `paginate(items, { keyCount })` — splits flat array into pages of `keyCount - 2` items
- Inserts `NEXT_PAGE_MARKER` between pages (not on last page)
- Returns `PaginationResult<T>` with pages containing `PaginatedItem[]` (including nulls for padding)

**Deck pagination (`deck/paginate-deck.ts`):**
- `paginateDeck({ baseDeckId, buttons, keyCount })` — wraps `paginate()` for addon deck buttons
- Converts `NEXT_PAGE_MARKER` into `core:page-nav` button at position `keyCount - 2` (=13 for 15-key)
- `core:page-nav` has onTap → next page, onHold → prev page (both `addToHistory: false`)

**Wiring in `addon-decks.ts` → `materializeAddonDecks()`:**
- When `gdeck.paginated === true`, calls `paginateDeck()` which splits buttons across multiple runtime decks
- Each paginated page becomes a separate `RuntimeDeck` with id like `emoji-selector-smileys-p1`

**Current pagination issue:** The `core:page-nav` buttons ARE inserted by `paginateDeck()` at position 13. The issue described ("pagination nav buttons don't appear") may stem from:
1. The `core:page-nav` frontend rendering a 0-indexed page indicator that looks broken
2. The page-nav button position conflicting with other button placement
3. OR — more likely — the category ROUTING deck (the one with category buttons) itself might not need pagination (it has ≤9 buttons for a 15-key device), but the EMOJI LIST decks (after selecting a category) do need it and already have `paginated: true`

### How keyMacro Works (Reuse Candidate for Paste)

**`keyMacroProvider.sendKey(comboOrText)`** — OS-agnostic keystroke simulation:
- **Linux:** xdotool/ydotool/dotool (auto-detects X11 vs Wayland via `XDG_SESSION_TYPE`)
- **macOS:** osascript (`tell application "System Events" to keystroke ...`)
- **Windows:** PowerShell SendKeys

**Combo parsing (`key-macro/parser.ts`):**
- `parseCombo("ctrl+v")` → `{ mods: ["ctrl"], key: "v" }`
- Modifier aliases: `ctrl`/`command`/`cmd` → `meta` (macOS maps `meta` → `command down` in osascript)
- Key normalization: single chars lowercased, special keys mapped

**Critical insight for paste simulation:** Using `ctrl+v` as the universal paste combo works cross-platform:
- Linux: xdotool sends Ctrl+V (correct)
- macOS: osascript maps `ctrl` → `command down`, so `ctrl+v` becomes Cmd+V (correct!)
- Windows: SendKeys maps `ctrl` → `^`, so `ctrl+v` → `^v` = Ctrl+V (correct!)

---

## 2. Integration Points

### Feature 1: Emoji-Selector Fixes

| Change | File(s) | What |
|--------|---------|------|
| Categories from JSON | `support.ts` + new `data/categories.json` | Replace `CATEGORY_DEFINITIONS` with JSON import |
| Favorites always shown | `decks/index.ts` | Always add favorites deck with default emojis when `config.favorites` is empty |
| Launcher label "Emojis" | `buttons/launcher/frontend.tsx` | Change default label or fix rendering |
| Category icons = real emoji | `buttons/category/frontend.tsx` | Already renders emoji chars as text — verify this works |
| Core pagination for category list | `decks/index.ts` | Already uses `paginated: true` — investigate why nav buttons don't appear |
| Page-nav on emoji list decks | Already wired via `paginateDeck()` | Investigate rendering issue |

**Files to modify:**
- `packages/cli/src/builtin-addons/emoji-selector/support.ts` — replace hardcoded categories with JSON import
- `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — new file, migrated from old repo
- `packages/cli/src/builtin-addons/emoji-selector/decks/index.ts` — favorites always shown with defaults
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher/frontend.tsx` — label rendering

### Feature 2: Paste Command

| Change | File(s) | What |
|--------|---------|------|
| Add keystroke after clipboard write | `deck/methods.ts` | In `pasteText()`, after `clipboardProvider.writeText()`, call `keyMacroProvider.sendKey("ctrl+v")` |
| Testable copy+paste | `deck/__tests__/methods.test.ts` | New test verifying both clipboard write AND keystroke dispatch |

**Files to modify:**
- `packages/cli/src/deck/methods.ts` — `pasteText()` method
- `packages/cli/src/deck/__tests__/methods.test.ts` — new tests

---

## 3. Dependencies Already Available

| What | Where | Reuse |
|------|-------|-------|
| `KeyMacroProvider.sendKey()` | `system/providers/key-macro.ts` | Call `sendKey("ctrl+v")` after clipboard write — already in `MethodsContext` |
| `ClipboardProvider.writeText()` | `system/providers/clipboard.ts` | Already called by `pasteText()` |
| `parseCombo()` | `system/providers/key-macro/parser.ts` | Can validate `ctrl+v` combo, but `sendKey()` handles raw strings too |
| `paginateDeck()` | `deck/paginate-deck.ts` | Already used by `materializeAddonDecks()` for `paginated: true` decks |
| `core:page-nav` button | `builtin-addons/core/buttons/page-nav/` | Already registered in core addon; backend handles tap → next, hold → prev |
| `createMethods()` | `deck/methods.ts` | Has access to both `keyMacroProvider` and `clipboardProvider` via closure |
| Provider pattern | `system/providers/` | Clipboard and key-macro are already pluggable per-OS |
| `zod` schemas | `support.ts` | `EmojiSelectorDeckSchema` already has `favorites: string[]` |
| Vitest test setup | `deck/__tests__/methods.test.ts` | Existing test patterns for `createMethods()` with mock providers |

---

## 4. Pitfalls

### Paste Keystroke Race Condition
**What goes wrong:** Clipboard write is async, and if the keystroke fires before the clipboard is updated, the target app pastes stale content.
**Why:** `clipboardProvider.writeText()` spawns an OS process (xclip/pbcopy/etc.) and `keyMacroProvider.sendKey()` spawns another process (xdotool/osascript/etc.). There's no guaranteed ordering between the two OS-level operations.
**How to avoid:** Both calls are `await`ed sequentially in the `pasteText()` function, and each provider waits for its process to exit before returning. Since the clipboard write process must complete (exit) before `writeText()` resolves, and the keystroke process starts after that, the ordering is guaranteed at the process level.

### Emoji Unicode in Shell Escaping
**What goes wrong:** Emoji characters (especially multi-byte ones like flag emojis) can break shell command escaping in clipboard providers.
**Why:** Linux clipboard uses `printf '%s' '${escaped}'` — single-quote escaping works for all Unicode, but the `'` replacement `text.replace(/'/g, "'\\''")` could fail on emoji that happen to include certain bytes.
**How to avoid:** The current escaping approach handles this correctly. The `printf '%s'` format specifier is byte-safe. Don't change the clipboard provider implementations.

### macOS Accessibility Permission
**What goes wrong:** osascript keystroke simulation requires Accessibility permissions on macOS. If the terminal/Node process doesn't have permission, `sendKey()` fails.
**Why:** macOS gates keyboard simulation behind Accessibility API permissions.
**How to avoid:** The `KeyMacroProvider` already throws `ProviderError` on failure, and the runtime catches and surfaces errors. This is an existing limitation of the `key-macro` provider, not specific to paste.

### Platform Modifier Mapping for Paste
**What goes wrong:** Using `meta+v` instead of `ctrl+v` would send the wrong key combo on some platforms.
**Why:** On Linux, `meta` maps to `super` (Super key), not Ctrl. On macOS, both `ctrl` and `meta` map to `command down`.
**How to avoid:** Always use `ctrl+v` — the per-platform providers handle the correct mapping:
- Linux: xdotool sends `ctrl+v` → Ctrl+V
- macOS: osascript maps `ctrl` → `command down` → Cmd+V  
- Windows: PowerShell SendKeys maps `ctrl` → `^` → Ctrl+V

### Favorites Default Emojis
**What goes wrong:** If `favorites` array is empty but we want to show default emojis, the current code skips the favorites deck entirely.
**Why:** `hasFavorites = config.favorites.length > 0` gates all favorites logic.
**How to avoid:** Change the check to always show favorites, falling back to a hardcoded default list of 10 popular emojis.

### JSON Import in TypeScript
**What goes wrong:** Importing `.json` files requires proper TypeScript config.
**Why:** `tsconfig.base.json` may or may not have `resolveJsonModule: true`.
**How to avoid:** Verify `tsconfig.base.json` includes `resolveJsonModule: true`. If not, add it. Alternatively, use `readFileSync` + `JSON.parse` at runtime, but import is cleaner for static data.

---

## 5. Recommended Approach

### Feature 1: Emoji-Selector Fixes

**Step 1: Create `data/categories.json`**
- New file at `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`
- Structure: `Array<{ id: string, label: string, icon: string, emojis: Array<{ char: string, shortcode: string }> }>`
- 10 categories: smileys, people, animals, nature, food, drink, activities, travel, objects, symbols, flags
- Migrate emojis from current `CATEGORY_DEFINITIONS` (8 categories) + add people, animals, drink from old repo

**Step 2: Update `support.ts`**
- Import categories from `./data/categories.json`
- Export a `loadCategories()` function that returns typed category specs
- Update `EmojiCategorySpec` interface to match JSON structure (emojis become `{ char, shortcode }[]` or keep as `string[]` depending on simplicity)
- Add `DEFAULT_FAVORITES` constant: 10 popular emojis (e.g. ❤️ 🔥 ⭐ 😂 👍 🎉 💯 ✨ 🙏 👑)

**Step 3: Fix `decks/index.ts` — Favorites always shown**
- Remove the `hasFavorites` guard — always show favorites category at position 0
- When `config.favorites` is empty, use `DEFAULT_FAVORITES`
- Shift all category buttons by 1 position

**Step 4: Fix launcher label**
- Change `EmojiLauncherButtonSchema` default from `"Emoji"` to `"Emojis"` 
- OR change the frontend rendering to show the label more prominently

**Step 5: Verify category icons**
- Category icons in `CATEGORY_DEFINITIONS` already use real emoji chars (e.g. `"🙂"`, `"🌿"`)
- `category/frontend.tsx` renders them as `<span className="text-3xl">{iconRef}</span>` — this IS real emoji, not SVG
- No change needed here — just verify it works visually

**Step 6: Investigate/fix page-nav on emoji list decks**
- `paginateDeck()` already inserts `core:page-nav` at position 13
- Check if the issue is that the `core:page-nav` button is being placed but not rendering
- Check if there's a position conflict (position 13 might collide with an existing button)
- The `paginate()` function uses `pageSize = keyCount - 2 = 13`, so each page has 13 emoji slots + 1 page-nav

### Feature 2: Core paste:// Command

**Step 1: Update `pasteText()` in `deck/methods.ts`**
```typescript
const pasteText: Methods["pasteText"] = async (text) => {
  if (clipboardProvider === undefined) {
    throw new NotImplementedError(
      "methods.pasteText requires a clipboardProvider (set via methods.setClipboardProvider)",
    )
  }
  await clipboardProvider.writeText(text)
  // Simulate paste keystroke (Ctrl+V / Cmd+V)
  if (keyMacroProvider !== undefined) {
    await keyMacroProvider.sendKey("ctrl+v")
  }
}
```

Key decisions:
- Use `ctrl+v` universally — platform providers handle the correct mapping
- `keyMacroProvider` is optional — if unavailable, clipboard write still succeeds (graceful degradation)
- Sequential `await` ensures clipboard write completes before keystroke fires

**Step 2: Update tests in `deck/__tests__/methods.test.ts`**
- Test that `pasteText()` calls both `clipboardProvider.writeText()` AND `keyMacroProvider.sendKey("ctrl+v")`
- Test that `dispatch("paste://🔥")` triggers both operations
- Test that missing `keyMacroProvider` still allows clipboard write (graceful degradation)

**Step 3: No changes needed to clipboard providers**
- Already OS-agnostic with per-OS implementations
- Already have `writeText()` working correctly
- No changes to the provider interface

**Step 4: No changes needed to key-macro providers**
- `sendKey("ctrl+v")` already works across all platforms
- Linux: xdotool handles `ctrl+v`
- macOS: osascript maps `ctrl` → `command down`
- Windows: PowerShell SendKeys handles `^v`

---

## Summary of Files to Modify

| File | Feature | Change |
|------|---------|--------|
| `emoji-selector/data/categories.json` | 1 | NEW — 10 categories with emoji data |
| `emoji-selector/support.ts` | 1 | Import from JSON, add DEFAULT_FAVORITES |
| `emoji-selector/decks/index.ts` | 1 | Always show favorites with defaults |
| `emoji-selector/buttons/launcher/frontend.tsx` | 1 | Label rendering fix |
| `emoji-selector/buttons/launcher/config.ts` | 1 | Default label change (if needed) |
| `deck/methods.ts` | 2 | Add keystroke simulation to pasteText() |
| `deck/__tests__/methods.test.ts` | 2 | Add paste+keystroke tests |
| `tsconfig.base.json` | 1 | Verify `resolveJsonModule: true` |
