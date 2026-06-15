---
wave: 2
depends_on: [59-GC4]
gap_closure: true
files_modified:
  - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
  - packages/cli/src/builtin-addons/emoji-selector/buttons/category.tsx
  - packages/cli/src/builtin-addons/emoji-selector/buttons/back.tsx
  - packages/cli/src/builtin-addons/emoji-selector/support.tsx
  - packages/cli/src/builtin-addons/emoji-selector/index.test.ts
  - packages/cli/src/deck/__tests__/runtime.test.ts
autonomous: true
objective: Ensure every emoji button (entry, category, back) uses the renamed `MainLabelSurface` (from Plan 59-GC4) and has a non-empty label. Removes the `createButtonNode` local helper and the `renderEmojiGlyph` text-only fallback in the entry button. Closes the follow-up gap from the user's GC3 review ("ensure all the emojis has label and use this new component").
created: 2026-06-12
---

# 59-GC5 — All emoji buttons use `MainLabelSurface` and have a label

> User's request (verbatim, post-59-GC3): "Also another to ensuire all the emojis has label and use this new component"

## Context

Plan 59-GC3 fixed the **icon duplication** bug by widening the emoji-selector's local `createButtonNode` helper to accept emoji chars. But the entry button render still has two divergent paths:

```typescript
// packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:25-31
render: ({ config }) =>
    EMOJI_ICON_ASSETS[config.emoji] !== undefined
      ? createButtonNode(
          getEmojiFallbackLabel(config.emoji),  // e.g., "GRIN" (label)
          EMOJI_ICON_ASSETS[config.emoji],       // (icon)
        )
      : renderEmojiGlyph(config.emoji),         // text-only, no label
```

For 12 of 383 emojis that have a custom branded icon, the button shows the icon + a short label (e.g., "GRIN"). For the other 371 emojis, the button shows the emoji char as text only — **no label**. The user wants every emoji button to have a label and use the new (post-59-GC4) `MainLabelSurface` component.

The fix:
- The `main` slot is the emoji char for non-icon emojis, or the custom icon for the 12 branded ones.
- The `label` slot is the category label (e.g., "Smileys") for ALL emojis — the category label is already in the entry button config (`config.label`) and is meaningful UX.
- All three emoji-selector buttons (entry, category, back) use the renamed `MainLabelSurface` directly. The local `createButtonNode` helper is removed.

## Tasks

### Task 1: Update the entry button to always use `MainLabelSurface`

**File:** `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx`

Replace the render body to always use `MainLabelSurface`:

```typescript
import { MainLabelSurface } from '@/ui/surfaces/MainLabelSurface'
import { resolveDomAssetSrc } from '@/addon/api'
import {
  EMOJI_ICON_ASSETS,
  EmojiEntryButtonSchema,
  getEmojiShortcode,
} from '../support'

const emojiEntryButton = defineMountedButton({
  configSchema: EmojiEntryButtonSchema,
  onDblTap: async ({ config, methods }) => {
    const shortcode = getEmojiShortcode(config.emoji)
    if (shortcode) {
      await methods.pasteText(`:${shortcode}:`)
    }
  },
  onTap: async ({ config, methods }) => {
    await methods.pasteText(config.emoji)
  },
  render: ({ config }) => (
    <MainLabelSurface
      main={EMOJI_ICON_ASSETS[config.emoji] ?? config.emoji}
      label={config.label}
    />
  ),
  type: 'emoji-emoji-button',
})
```

Notes:
- The `main` slot is the custom icon if available, otherwise the emoji char itself.
- The `label` is the category label from the entry button config (set by the deck generator as `label: category.label` in `index.ts:96`). This is always a non-empty string per the existing schema.
- The `renderEmojiGlyph` import and `getEmojiFallbackLabel` import are no longer needed and should be removed from this file.
- The default fallback when no icon is present is now the emoji char rendered via the new `MainLabelSurface` (which decides between icon vs glyph via `isIconSource`).

### Task 2: Update the category button

**File:** `packages/cli/src/builtin-addons/emoji-selector/buttons/category.tsx`

Replace `createButtonNode(config.label, config.icon)` with `<MainLabelSurface main={config.icon} label={config.label} />`. Remove the `createButtonNode` import.

```typescript
import { MainLabelSurface } from '@/ui/surfaces/MainLabelSurface'

const emojiCategoryButton = defineMountedButton({
  configSchema: EmojiCategoryButtonSchema,
  render: ({ config }) => (
    <MainLabelSurface main={config.icon} label={config.label} />
  ),
  type: 'emoji-category-button',
})
```

### Task 3: Update the back button

**File:** `packages/cli/src/builtin-addons/emoji-selector/buttons/back.tsx`

Replace `createButtonNode(config.label, config.icon)` with `<MainLabelSurface main={config.icon} label={config.label} />`. Remove the `createButtonNode` import.

```typescript
import { MainLabelSurface } from '@/ui/surfaces/MainLabelSurface'

const emojiBackButton = defineMountedButton({
  configSchema: EmojiBackButtonSchema,
  render: ({ config }) => (
    <MainLabelSurface main={config.icon} label={config.label} />
  ),
  type: 'emoji-back-button',
})
```

### Task 4: Remove `createButtonNode` from support.tsx

**File:** `packages/cli/src/builtin-addons/emoji-selector/support.tsx`

The `createButtonNode(label, main)` helper is no longer used after Tasks 1-3. Remove the function and its `Icon` import (if `Icon` is no longer used in `support.tsx` after the removal — check first; if still used, leave the import).

The `isIconSource` helper is also no longer needed in `support.tsx` (it lives in `MainLabelSurface` after 59-GC4). Remove the local copy from `support.tsx`.

### Task 5: Update tests

**File:** `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`

- The test `'renders the real unicode glyph for non-branded emojis via the native font stack'` (currently expects `text-5xl` and `🛰️` only) — update to expect the category label `Custom` ALSO in the HTML, and the emoji to be rendered via the new `MainLabelSurface` (no longer via `renderEmojiGlyph`).
- The test `'renders bundled icon-backed emoji entry buttons for shipped emoji values'` (currently expects `emoji-grin.svg` and `GRIN`) — update to expect `Smileys` (the category label) instead of `GRIN`. The custom icon is still rendered (because the emoji is in `EMOJI_ICON_ASSETS`).
- Other tests that use the `label` value should still pass since `config.label` is the category name (e.g., "Smileys") for all shipped emojis.

**File:** `packages/cli/src/deck/__tests__/runtime.test.ts`

- The test `'navigates generated emoji decks and pastes the favorite on tap'` at line 1083+ asserts `getRenderedButtonHtml(getRenderedButton(runtime, 0)).toContain('GRIN')` (line 1149) — update to expect the category label (`Favorites`) instead.

### Task 6: Build and verify

**Action:** Run build and the affected test suites.

**Verify:** `pnpm --filter sireno-deck-cli build` exits 0. `pnpm --filter sireno-deck-cli test src/builtin-addons/emoji-selector src/deck/__tests__/runtime.test.ts` — same baseline (3 emoji-selector failures, 0 runtime test regressions).

**Done:** Every emoji button (entry, category, back) renders via `MainLabelSurface` with both a `main` slot and a `label`. The `createButtonNode` helper is gone. The `renderEmojiGlyph` is no longer used in the entry button (it can stay in `support.tsx` for any future use, or be removed — agent's discretion).

## Must Haves

- [ ] Entry button render uses `MainLabelSurface` with `main` (icon or emoji) and `label` (category label from config)
- [ ] Category button render uses `MainLabelSurface`
- [ ] Back button render uses `MainLabelSurface`
- [ ] `createButtonNode` helper removed from `support.tsx`
- [ ] `isIconSource` local copy removed from `support.tsx` (the canonical one lives in `MainLabelSurface` after 59-GC4)
- [ ] `renderEmojiGlyph` and `getEmojiFallbackLabel` no longer used in `entry.tsx`
- [ ] Test `'renders the real unicode glyph for non-branded emojis via the native font stack'` updated to expect the category label
- [ ] Test `'renders bundled icon-backed emoji entry buttons for shipped emoji values'` updated to expect the category label (not `GRIN`)
- [ ] Test `'navigates generated emoji decks and pastes the favorite on tap'` updated to expect `Favorites` (not `GRIN`)
- [ ] No regressions in any existing test suite
- [ ] Build is clean

## Notes for downstream

- The entry button label change is a UX improvement: every emoji now has a category label (e.g., "Smileys") below it, not just the 12 branded emojis with a short codepoint-style label. This is more consistent and easier to scan in a 13-button grid.
- The `renderEmojiGlyph` helper in `support.tsx` is no longer called by any entry button. It can be kept (for any future use) or removed (YAGNI). The plan defers this to the executor's discretion.
- Plan 59-GC5 closes the broader gap the user identified: all emojis in the UI are now labeled and use the new generic surface.
