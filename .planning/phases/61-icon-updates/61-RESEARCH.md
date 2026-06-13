# Phase 61: Icon updates — Research

**Gathered:** 2026-06-12
**Status:** Ready for planning

## Don't Hand-Roll

- **Reuse `<Icon>` (`packages/cli/src/ui/Icon.tsx`)** for both `undo2` and `send-to-back` — both are valid lucide-react names. No custom SVG needed.
- **Reuse `MainLabelSurface` for ICON-01** — the system back button is a single-icon + label layout, exactly what `MainLabelSurface` was designed for (Phase 59 GC4). Just change the `main.name` value.
- **DO NOT use `MainLabelSurface` for ACTIVEAPP-08** — the dual-icon layout (background + badge) is specific to this button. Per CONTEXT, "a small dedicated render function (not a generic component) since the layout is specific to this one button."

## Common Pitfalls

- **Stale closure when passing props at render time.** The `render: () => createElement(...)` callback in `runtime.ts:1033` runs on every re-render. The render closure must reference the live `overlayDeckId` and `runtimeDecks` (closure-captured from `createDeckRuntime`). If the render function were extracted outside the closure, the props would be frozen. Keep it inline.

- **Deck has no `icon` field.** `DeckConfig` (schemas.ts:185) has `name`, `id`, `background`, `deckType`, `process_names`, `system`, but no `icon`. The CONTEXT's "first emoji char if no icon" hint suggests extracting an emoji from the deck name (e.g., "📺 Netflix" → 📺). This is a soft heuristic, not a config field.

- **Label changes can break visual tests.** The system back swap is `chevron-left` → `undo2`. Any test asserting on the `data-sireno-icon-name` attribute or screenshot will need updating. Check `__tests__/` for any icon-name assertions.

- **The runtime render path is shared with the system back button.** Both `SystemBackButton` and `OverlayToggleButton` are rendered inline at runtime.ts:1033 and :1119. Changing the render path for one may affect the other if done carelessly.

## Existing Patterns in This Codebase

- **System buttons are stateless React components, NOT `defineMountedButton` mounted buttons.** The runtime handles their `onTap`/`onDblTap`/`onHold` via inline object literals in `runtime.ts:1025-1120`. The `render: () => createElement(...)` returns a fresh element on every re-render. This is the simplest model and what we'll use for the dual-icon overlay toggle.

- **Closure pattern in runtime.ts for derived state.** Look at how `system-back` button reads `currentDeck`, `tapCommand`, `holdCommand` (lines 1057-1066): it accesses `runtimeDecks[deckId]` and `deckController` directly from the closure. Same pattern: read `runtimeDecks[overlayDeckId]?.name` from the closure when rendering the overlay toggle.

- **Layered visual elements (background + badge)** are not currently used in any button. This will be the first. The `MainLabelSurface` is column-flex. For dual-icon, use absolute positioning relative to a containing div.

## Recommended Approach

### Part A — ICON-01 (1 file, 1 line)

`packages/cli/src/deck/system-buttons/SystemBackButton.tsx:16` — change default icon from `chevron-left` to `undo2`:

```diff
-         main={{
-           name: backIconOverride ?? 'chevron-left',
-         }}
+         main={{
+           name: backIconOverride ?? 'undo2',
+         }}
```

The `backIconOverride` prop is preserved (users can still override per-deck). Default flips to `undo2`.

### Part B — ACTIVEAPP-08 (3 files)

1. **Modify `OverlayToggleButton.tsx`** to accept a single `activeOverlayDeck` prop (nullable). Render layout:
   - Background: `<Icon name="send-to-back" size={48} tone="muted" />` (larger, muted)
   - Foreground badge (bottom-right): icon derived from the deck's name (first emoji char if present, else a small generic `layout-grid` icon)
   - Label: deck name (e.g., "Chrome") or "Show App" when null

2. **Modify `runtime.ts:1033`** to pass the active overlay deck. The render function already has access to `runtimeDecks` and `overlayDeckId` via closure:

```ts
render: () =>
  createElement(OverlayToggleButton, {
    activeOverlayDeck: overlayDeckId ? runtimeDecks[overlayDeckId] ?? null : null,
  }),
```

3. **No new test scaffolding required.** The button is a stateless component. Add a `OverlayToggleButton.test.tsx` to verify:
   - null active deck → neutral layout (send-to-back + "Show App" label, no badge)
   - active deck with name → label is the deck name
   - active deck with emoji in name → emoji extracted as badge

## Key File References

- `packages/cli/src/deck/system-buttons/SystemBackButton.tsx:16` — ICON-01 swap target
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx:6-17` — ACTIVEAPP-08 rewrite target
- `packages/cli/src/deck/runtime.ts:1025-1034` — overlay toggle render path (props injection point)
- `packages/cli/src/deck/runtime.ts:1462-1495` — overlay state management (`overlayDeckId` lives in closure)
- `packages/cli/src/ui/Icon.tsx` — `<Icon>` resolves lucide icon names
- `packages/cli/src/ui/surfaces/MainLabelSurface.tsx:7-21` — `isIconSource` helper (reusable for emoji extraction)
- `packages/cli/src/core/schemas.ts:185-195` — `DeckConfig` shape (no `icon` field)
- `packages/cli/src/deck/__tests__/system-buttons-dispatcher.test.ts` — existing system button tests (no component tests today)

## Confidence

- **HIGH** — ICON-01 is a one-line icon name change. No structural risk.
- **HIGH** — ACTIVEAPP-08 prop drilling pattern matches the existing `system-back` precedent (runtime.ts:1057-1066).
- **MEDIUM** — The "first emoji char" heuristic for the badge icon is a soft rule. Real-world overlay decks may not have emojis in names; the chrome overlay deck (Phase 64) hasn't been built yet, so we don't have a canonical example to validate against.
