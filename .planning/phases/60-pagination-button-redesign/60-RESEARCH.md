# Phase 60: Pagination button redesign — Research

**Phase:** 60 — Pagination button redesign (PAG-02, PAG-03)
**Mode:** Sequential (parallelization.enabled: false)
**Confidence on the research questions below:** HIGH — all answers are grounded in the existing codebase.

## Don't Hand-Roll

- **Don't build a new text-fitting component.** `<Label>` already wraps `<Text>` with `fit="ellipsis"`. The PAG-03 requirement ("uses the shared `<Label>` component or equivalent to handle text fitting without overflow") is met by simply using `<Label>` for each of the 3 lines. [VERIFIED: `packages/cli/src/ui/Label.tsx:11-19`]

- **Don't add a new prop for currentPage/totalPages.** `buildPageNavButton` already receives them as arguments; just thread them into the returned config object.

- **Don't change the onTap/onDblTap behavior.** The new render is purely visual. Navigation handlers stay as they are.

## Common Pitfalls

- **Forgetting to handle the no-op cases** (first page → no previous, last page → no next). The existing `tapNoop` and `doubleTapNoop` booleans flag these; the new render must respect them (hide the unavailable line, or dim it).
- **Adding a `<Chip>`-based layout when the requirement is plain text.** PAG-02 specifies a 3-line text layout; chips add visual noise that defeats the purpose.
- **Breaking the `addToHistory: false` navigation.** The onTap/onDblTap handlers in `change-deck.tsx` (lines 60-76) are independent of the render. Do not modify them.
- **Removing the `Chip` import without checking for other usages.** `<Chip>` may still be used elsewhere; only remove the import if it's truly unused after the refactor.

## Existing Patterns in This Codebase

- **`renderPageNavContent` (`change-deck.tsx:43-57`)** — the current 2-element layout (chevron icon + "Tap"/"Dbl Tap" chips at corners). To be replaced with 3 lines of centered text.
- **`PageNavButtonConfig` (`pagination.ts:16-26`)** — the config interface. Needs `currentPage: number, totalPages: number` added so the render can read "Page X/Y".
- **`<MainLabelSurface>` (renamed from IconLabelSurface in Phase 59 GC4)** — NOT appropriate here since the pagination button has no icon/emoji. Pure text layout, not icon-plus-label.
- **2-line button variant in the system back button** (`SystemBackButton.tsx` and `OverlayToggleButton.tsx`) — uses `<div className="flex flex-col gap-0.5">` with two children. The pagination button will follow the same pattern with 3 children.
- **`<Label>` component** (`packages/cli/src/ui/Label.tsx`) — wraps `<Text>` with `fit="ellipsis"`, `size="md"`, `tone="primary"`, `uppercase leading-tight tracking-tight`. Already handles overflow.
- **Prior art for `-p{N}` suffix:** see [`.planning/solutions/best-practices/paginated-deck-suffix-constant-not-shared-2026-06-10.md`](../../solutions/best-practices/paginated-deck-suffix-constant-not-shared-2026-06-10.md) — the suffix pattern is duplicated between `pagination.ts` and `system-buttons.ts`. Not in scope for this phase, but a future cleanup could DRY this.

## Recommended Approach

One vertical slice (one plan, autonomous, NOT single_layer_justified — the deliverable spans data + render + tests, but it IS one demoable end-to-end behavior: "the pagination button renders 3 lines"):

1. Extend `PageNavButtonConfig` with `currentPage: number, totalPages: number`. Thread them into the returned config in `buildPageNavButton` (`pagination.ts:64-89`).
2. Replace `renderPageNavContent` in `change-deck.tsx:43-57` (and its call site at line 79-95) with a new 3-line component that uses `<Label>` for each line:
   - Line 1: `"Tap >"` (hidden on last page when `tapNoop` is true)
   - Line 2: `"< 2xTap"` (hidden on first page when `doubleTapNoop` is true)
   - Line 3: `"Page X/Y"` (where X = `config.currentPage`, Y = `config.totalPages`)
3. Update `pagination.test.ts` tests to assert the new config fields (`currentPage`, `totalPages`).
4. Add a focused unit test for the new render verifying the 3 lines appear (or 2 if at first/last page).
5. Remove the now-unused `<Chip>` import from `change-deck.tsx` if no other code path uses it.

## Confidence Summary

| Question | Confidence | Evidence |
|----------|-----------|----------|
| `<Label>` handles overflow | HIGH | [`packages/cli/src/ui/Label.tsx:11-19`](../../packages/cli/src/ui/Label.tsx) — `fit="ellipsis"` |
| 3-line button pattern is feasible | HIGH | [`packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx`](../../packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx) — 2-line variant exists |
| `meta: 'page-nav'` discriminator works | HIGH | [`packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx:79-95`](../../packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx) — already used in production |
| No new dependencies needed | HIGH | All required components (`Label`, `Text`) are already in `@/ui` |

---

*Phase: 60-pagination-button-redesign*
*Research: 2026-06-12*
