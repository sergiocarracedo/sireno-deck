---
wave: 1
depends_on: []
gap_closure: true
files_modified:
  - packages/cli/src/builtin-addons/emoji-selector/data/categories.json
  - packages/cli/src/ui/surfaces/IconLabelSurface.tsx
  - packages/cli/src/ui/surfaces/IconLabelSurface.test.tsx (if it exists; add if not)
autonomous: true
objective: Deduplicate the emoji-selector category button icons (5 of 11 categories share an icon with another category). Implement the user's recommended approach: rename the surface component to a generic name, rename the `icon` prop to `main`, accept an emoji char OR an icon src in the slot. Closes test 1 gap from 59-UAT.md.
created: 2026-06-12
---

# 59-GC3 — Deduplicate emoji-selector category icons

> Real UAT on a real Stream Deck found: 5 of 11 category buttons render the same icon as another category. From the user's photo: smileys + people both show a yellow smiley face; animals + nature show the same candle/leaf; food + drink show the same fork/knife; travel + objects + flags all show the same white box.
>
> The Phase 57 RES-03 audit confirmed **zero char overlap** in the emoji data — that part of EMO-17 is satisfied. But the original audit only checked chars, not icon assets. The user's perception of "duplication" is real and observable in the hardware photo.

## Context

The `icon` field in `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` points at SVG assets in `packages/cli/src/builtin-addons/emoji-selector/assets/`. Of the 11 categories, 5 share an icon with another:

| Category | Current icon (SVG) | Issue |
|----------|--------------------|-------|
| smileys | smileys.svg | unique |
| people | smileys.svg | **dup of smileys** |
| animals | nature.svg | **dup of nature** |
| nature | nature.svg | unique |
| food | food.svg | unique |
| drink | food.svg | **dup of food** |
| activities | activities.svg | unique |
| travel | objects.svg | **dup of objects** |
| objects | objects.svg | unique |
| symbols | symbols.svg | unique |
| flags | objects.svg | **dup of travel AND objects** |

Available distinct SVG assets in the assets directory: 21 files. The existing emoji-themed assets (`emoji-berry.svg`, `emoji-cool.svg`, `emoji-fire.svg`, `emoji-grin.svg`, `emoji-joy.svg`, `emoji-leaf.svg`, `emoji-party.svg`, `emoji-pizza.svg`, `emoji-rainbow.svg`, `emoji-sushi.svg`, `emoji-wave.svg`) can fill the gaps.

**User's recommended approach (verbatim from UAT):** "why not just use a real emoji (maybe requires to change the iconLAbelSurface to accept a text in the icon slot, we can rename it to component name (do suggestion) and rename the icon prop to `main`"

The user's idea is more flexible than picking 5 new SVGs: change the rendering layer to accept an emoji char directly. Then we can use a semantic emoji char per category (e.g. 😀 for smileys, 👤 for people) and never need new SVG assets. The icon set just becomes whatever chars fit semantically.

## Tasks

### Task 1: Rename the surface component and the prop

**File:** `packages/cli/src/ui/surfaces/IconLabelSurface.tsx`

Rename the component (and export) to a more generic name. Suggestions (pick one):
- `MainLabelSurface` (mirrors the `main` prop name)
- `PrimaryLabelSurface`
- `GlyphLabelSurface` (since the slot is now a "glyph" that can be either an icon src or a char)

Pick `MainLabelSurface` to match the user's `main` prop name. Rename the file too: `MainLabelSurface.tsx`. Update all importers.

Rename the `icon` prop to `main`. The type widens from `string` (icon src) to `string` (icon src **or** emoji char). The implementation distinguishes by checking if the string looks like a URL/path (contains `.svg` or starts with `addon://`/`icon://`/`builtin://`) or just renders it as text.

If the value is treated as text (emoji char), it should render in a font that supports the glyph (e.g. `font-emoji` or `Twemoji` — but Twemoji is not in the current asset set; just rendering as text in the existing font should work for most emoji). The simplest approach: if the value contains `.svg` or starts with a known icon-scheme prefix, render via `<Icon src={...} />`; otherwise render as a `<span>` with `text-3xl` or similar large size.

### Task 2: Update category icon entries to use distinct emoji chars

**File:** `packages/cli/src/builtin-addons/emoji-selector/data/categories.json`

Change the `icon` field for the 5 duplicated categories to use a distinct emoji char. Suggested mapping (semantic per category):

| Category | New icon value |
|----------|----------------|
| smileys | `addon://emoji-selector/smileys.svg` (unchanged) |
| people | `👤` (bust in silhouette) |
| animals | `🐾` (paw prints) |
| nature | `addon://emoji-selector/nature.svg` (unchanged) |
| food | `addon://emoji-selector/food.svg` (unchanged) |
| drink | `🥤` (cup with straw) |
| activities | `addon://emoji-selector/activities.svg` (unchanged) |
| travel | `✈️` (airplane) |
| objects | `addon://emoji-selector/objects.svg` (unchanged) |
| symbols | `addon://emoji-selector/symbols.svg` (unchanged) |
| flags | `🚩` (triangular flag) |

The user can adjust the specific chars during plan-check or execution. The principle is: every category gets a **visually distinct** icon.

### Task 3: Update emoji-selector support to pass `main` instead of `icon`

**File:** `packages/cli/src/builtin-addons/emoji-selector/support.tsx` (or wherever the surface is created)

The `createButtonNode(label, icon)` helper currently takes `(label, icon)`. Rename to `createButtonNode(label, main)` and pass it to the new `MainLabelSurface` component (formerly `IconLabelSurface`). This is a small follow-on to Task 1.

### Task 4: Add a focused unit test for the new behavior

**File:** `packages/cli/src/ui/surfaces/MainLabelSurface.test.tsx` (new)

Test:
- Renders with an icon src (path) → renders an `<Icon>` element
- Renders with an emoji char → renders the char as text
- Renders with no `main` → renders nothing in the slot

### Task 5: Build and verify

**Action:** Run build and the affected test suites. The `emoji-selector/index.test.ts` tests that exercise the category button rendering should still pass.

**Verify:** `pnpm --filter sireno-deck-cli build` exits 0. `pnpm --filter sireno-deck-cli test src/ui/surfaces src/builtin-addons/emoji-selector` — all tests pass.

**Done:** All 11 category buttons render visually distinct icons.

## Must Haves

- [ ] `IconLabelSurface` renamed to a generic name (suggested: `MainLabelSurface`); file renamed; all importers updated
- [ ] `icon` prop renamed to `main`; type widened to accept icon src OR emoji char
- [ ] Implementation distinguishes icon-src vs text-emoji rendering
- [ ] `categories.json` updated: 5 duplicated category icons replaced with distinct emoji chars
- [ ] New unit test covers the new rendering behavior
- [ ] No regressions in `emoji-selector/index.test.ts` or other affected suites
- [ ] Build is clean
