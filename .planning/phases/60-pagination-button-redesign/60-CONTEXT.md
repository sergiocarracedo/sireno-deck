# Phase 60: Pagination button redesign — Context

**Gathered:** 2026-06-12
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current chip-based pagination button (chevron icon + "Tap"/"Dbl Tap" chips) with a 3-line text layout: "Tap >", "< 2xTap", "Page X/Y". The button is used in multi-page addon decks (emoji-selector) and any deck that generates pagination via `buildPageNavButton`.

The button renders as a `change-deck` with `meta: 'page-nav'`. Its render lives in `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` (the `renderPageNavContent` function at line 43-57); the config builder is `buildPageNavButton` in `packages/cli/src/core/pagination.ts`.

**Out of scope:** pagination logic changes, navigation behavior, page-splitting heuristics, multi-deck coordination. The button is purely a **visual replacement** — same targets, same onTap/onDblTap behavior, same position (keyCount-2), same addToHistory:false navigation.

</domain>

<decisions>
## Implementation Decisions

### CurrentPage/totalPages data source
- **Add `currentPage` and `totalPages` to the button config.** Extend the `PageNavButtonConfig` interface in `core/pagination.ts:24-32` with `currentPage: number, totalPages: number`. `buildPageNavButton` already receives these as arguments at its call site (line 108 of emoji-selector `index.ts`); they just need to be threaded into the returned config object.
- The render (in `change-deck.tsx`) reads `config.currentPage` and `config.totalPages` directly to render "Page X/Y". This avoids any runtime introspection and is the simplest, least-fragile approach.

### Edge cases (agent's discretion)
- **First page** (no previous): show "Tap >" only; hide the "< 2xTap" line (or render it dimmed — agent picks).
- **Last page** (no next): show "< 2xTap" only; hide the "Tap >" line.
- **Single page** (no sibling decks): currently `buildPageNavButton` is NOT called for single-page decks (emoji-selector `index.ts` checks `isMultiPage`). So this case does not occur at render time. If it somehow does, show "Page 1/1" with both lines muted.
- The existing `tapNoop` and `doubleTapNoop` booleans in `renderPageNavContent` already flag these cases — the agent can reuse them.

### Layout & sizing (agent's discretion)
- Use the shared `<Label>` component (per PAG-03) for each of the 3 lines. The `Label` component handles text fitting without overflow — the requirement states "no overflow at any page count."
- Suggested sizing: `text-xs` for the tap/2xTap lines, `text-sm` for the page indicator. This fits within a standard 15-key grid. For smaller key counts (9, 6), the `Label` ellipsis or wrap ensures no overflow.
- No icons — the 3-line layout replaces the chevron and chips entirely. The lines ARE the visual.
- The `<Chip>` component (currently used for "Tap"/"Dbl Tap") is no longer needed in the page-nav render path.

</decisions>

<specifics>
## Specific Ideas

- The pagination button is always position `keyCount - 2` (second-to-last slot on the deck, next to the system back button). The layout should account for the physical button size (smaller than center buttons due to edge positioning).
- The "Tap >" line indicates tapping goes forward; "< 2xTap" indicates double-tapping goes backward. These are consistent with the current tap=next, dbltap=prev semantics.
- The user might want the tap/2xTap labels to visually indicate the navigation direction — "Tap >" suggests forward, "< 2xTap" suggests backward. Keep this consistent.

</specifics>

<canonical_refs>
## Canonical References

- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — current `renderPageNavContent` (lines 43-57) to replace; the `config.meta === 'page-nav'` detection branch (lines 79-95) for context.
- `packages/cli/src/core/pagination.ts` — `buildPageNavButton` (lines 64-89) and `PageNavButtonConfig` interface (lines 16-26). Both need updating to thread `currentPage`/`totalPages` into the config.
- `packages/cli/src/core/pagination.test.ts` — tests for `buildPageNavButton` that need updating for the new config shape.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts:108` — one of the call sites of `buildPageNavButton`.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — tests that assert `meta: 'page-nav'` on pagination buttons; these don't check the new config fields but may need minor assertion updates.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `<Label>` — shared component that handles ellipsis overflow, required by PAG-03.
- `<Text>` — more flexible than Label, supports string children with `size` prop. Could be used for better control over each line's sizing.
- `MainLabelSurface` — the renamed IconLabelSurface (from Phase 59 GC4). NOT appropriate here since the pagination button has no icon or emoji — it's pure text layout.

### Established Patterns
- The `config.meta === 'page-nav'` branch in `change-deck.tsx` is the render entry point. It conditionally renders the pagination content for page-nav buttons vs. regular change-deck buttons.
- `buildPageNavButton` returns a `change-deck` config with meta='page-nav', position at `keyCount - 2`. The rest of the config (target_deck, target_deck_double_tap) is used by the onTap/onDblTap handlers.
- Navigation uses `addToHistory: false` for page-nav buttons.

### Integration Points
- `change-deck.tsx:79-95` — the `if (config.meta === 'page-nav')` branch. Replace the `renderPageNavContent(...)` call with the new 3-line layout.
- `pagination.ts:64-89` — `buildPageNavButton`: add `currentPage` and `totalPages` to `PageNavButtonConfig` and thread them in.
- No changes needed to the `definePagedCategoryButton` (it handles category buttons, not page-nav buttons) or to the navigation handlers (the onTap/onDblTap behavior is unchanged).

</code_context>

<deferred>
## Deferred Ideas

- **No-text-fallback mode:** If a page-nav button is in a very small key count (e.g., 6 keys), the 3-line layout could overflow. The current `Label` component handles ellipsis, which is sufficient. A future phase could add a compact 1-line mode ("Page X/Y" only) for extreme cases, but this is not needed for v1.6.

</deferred>

---

*Phase: 60-pagination-button-redesign*
*Context gathered: 2026-06-12*
