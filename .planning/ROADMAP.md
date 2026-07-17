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

## Phase 4: Settings Deck

**Goal:** Add an internal settings deck with brightness controls and app info, accessible from the main system settings button.

**Depends on:** P3
**Blocks:** None
**Status:** [ ] Not started

### Success Criteria

- [ ] System settings button navigates to a new internal settings deck
- [ ] A reusable progress surface exists with icon, label, and progress bar (progress value is provided externally; show/hide-on-tap behavior is built in)
- [ ] Brightness darker button at position 0 decreases screen brightness and shows progress bar
- [ ] Brightness lighter button at position 1 increases screen brightness and shows progress bar
- [ ] App info button at position 2 shows the app logo and version
- [ ] Emulator stores a brightness value and exposes it via state; real device uses wsBridge messages to change hardware brightness

### Tasks

- [ ] T4.1: Extract a reusable progress surface component (`IconLabelProgressSurface`) that accepts icon, label, progress value, and visibility; shows progress on tap and hides after a timeout — `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx`
- [ ] T4.2: Create internal settings deck factory with darker/lighter/app-info buttons — `packages/cli/src/builtin-addons/internal-settings/decks/index.ts` (or core deck system)
- [ ] T4.3: Wire the system settings button in the main deck to navigate to the settings deck — `packages/cli/src/builtin-addons/core` deck generation
- [ ] T4.4: Add brightness state mutation and wsBridge command in `OutputClient` (emulator stores value, real device sends hardware brightness command) — `packages/cli/src/outputClient/emulator.ts` and `packages/cli/src/outputClient/real.ts`
- [ ] T4.5: Add tests for the progress surface and settings deck wiring

### Must-Haves

- Progress surface is a reusable UI component themes can override
- Brightness controls work in both emulator and real mode
- Settings deck is reachable from the main deck settings button

### Nice-to-Haves

- Progress bar auto-dismisses with a smooth transition

---

## Phase 5: Overlay Decks

**Goal:** Decks can declare a `trigger` (process name + optional window-name regex) and surface as an overlay layer when the active window matches, with a toggle button to switch between regular and overlay layers, each with independent navigation history.

**Depends on:** P4
**Blocks:** None
**Status:** [ ] Not started

### Success Criteria

- [ ] Deck `trigger` matches on process name **and** optional window-name regex (case-insensitive)
- [ ] When trigger matches, overlay deck is available; `autoShow: true` switches to it automatically
- [ ] When trigger stops matching, overlay is dismissed
- [ ] Regular decks inject an `n-1` system button rendered via `SplitSurface` showing the conventional action (settings at home, back elsewhere) as primary and `core:overlay-toggle` (deck icon + dbltap affordance) as secondary
- [ ] `core:overlay-toggle` dbltap switches from regular deck layer to overlay deck layer
- [ ] Overlay decks have an independent navigation history (separate back stack from regular decks)
- [ ] Overlay deck's `n-1` button shows only the toggle deck layer (back + overlay-toggle) — no settings button
- [ ] Overlay deck's back button navigates within the overlay's own history
- [ ] Overlay deck's back button **onhold** navigates to the regular deck layer's main deck
- [ ] `core:overlay-toggle` surface renders the deck's icon with a dbltap hint

### Tasks

- [ ] T5.1: Extend `TriggerSchema` to accept window-name pattern with regex/case-insensitive matching — `packages/cli/src/config/schemas.ts`, `packages/cli/src/system/glob-match.ts`
- [ ] T5.2: Wire `autoShow` semantics — when true and trigger matches, set overlay automatically without user toggle — `packages/cli/src/deck/runtime.ts`
- [ ] T5.3: Implement per-deck navigation history stack (overlay decks have an isolated stack separate from the regular layer) — `packages/cli/src/deck/runtime.ts`
- [ ] T5.4: Update system back injection to use `SplitSurface` for the `n-1` button when overlay is available, with conventional action primary + `core:overlay-toggle` secondary — `packages/cli/src/deck/system-back-injection.ts`
- [ ] T5.5: Implement `core:overlay-toggle` button surface (deck icon + dbltap affordance) and wire dbltap to switch layers — `packages/frontend/...` (overlay-toggle surface)
- [ ] T5.6: Implement overlay-deck back-button onhold gesture to jump to the regular layer's main deck — `packages/cli/src/deck/runtime.ts`, `packages/frontend/...`
- [ ] T5.7: Add tests: trigger regex matching, autoShow behaviour, independent history, SplitSurface n-1 injection, onhold back-to-main, overlayToggle dbltap layer switch — `packages/cli/src/deck/__tests__/`

### Must-Haves

- Window-name matching uses a real regex (not glob), with `i` flag support
- Overlay deck layer is fully isolated: history, back-button behaviour, n-1 injection
- `core:overlay-toggle` is a first-class system surface (typed, themed, overridable)
- No regression on non-overlay deck flows

### Nice-to-Haves

- Visual flash/animation when overlay layer activates/deactivates
- Per-overlay-deck custom toggle icon (fall back to deck icon if absent)

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
| P4 | Settings deck opens | System settings button navigates to internal settings deck |
| P4 | Brightness controls | Tap brighter/darker changes screen brightness value and shows progress bar |
| P4 | App info button | Button shows app logo and version string |
| P5 | Trigger matches by process + window regex | Unit test: matcher returns true for matching process + matching window-name regex, false otherwise |
| P5 | autoShow switches overlay automatically | Unit test: when autoShow=true and trigger matches, overlay activates without manual toggle |
| P5 | Independent overlay history | Unit test: navigating inside overlay deck does not push onto regular layer history; back from overlay root dismisses overlay |
| P5 | SplitSurface n-1 with overlay available | Build-config test: n-1 button is `core:split` with primary=settings/back + secondary=core:overlay-toggle |
| P5 | OverlayToggle dbltap switches layer | Runtime test: dbltap on `core:overlay-toggle` while in regular layer activates overlay deck |
| P5 | Back-button onhold jumps to main deck | Gesture test: long-press on overlay back button from overlay root dismisses overlay and shows regular layer's main deck |

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
