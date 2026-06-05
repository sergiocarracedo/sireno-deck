# Phase 46: Emoji-Selector Multi-Page — Context

**Gathered:** 2026-06-06
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Paginate emoji-selector categories that overflow the deck. Each category gets its own pagination (starts on page 1), with prev/next navigation buttons using the existing `change-deck` button type. The back button moves to the system-reserved last slot. No new button types — reuse `change-deck` and the existing emoji button types.

</domain>

<decisions>
## Implementation Decisions

### Prev/Next Button Placement
- **Decision:** Prev/next buttons occupy fixed positions at the end of the page, immediately before the system-reserved last slot. Layout: emoji entries fill positions `[0..keyCount-4]`, prev at `keyCount-3`, next at `keyCount-2`, system back at `keyCount-1`. For a 15-key deck: 12 emojis (positions 0-11), prev (12), next (13), system back (14).
- **Rationale:** Keeps emoji entries contiguous at the start of the page for visual consistency. Matches the pattern of putting navigation controls at predictable trailing positions.

### Page Indicator
- **Decision:** The prev/next button labels include the page number. Format: prev button label = `"‹ Page N"`, next button label = `"Page N ›"`. No separate non-interactive page indicator element.
- **Rationale:** Self-documenting navigation — user always sees which page they're on from the adjacent buttons. No extra UI elements needed on space-constrained button grid.

### Main Deck Category Overflow
- **Decision:** Deferred — not part of this phase. The main emoji-selector deck shows category buttons + back button as it currently does. If the number of categories exceeds `keyCount - 1`, config validation will reject the config. Adding category index pagination is a future concern.
- **Rationale:** The current 3 hardcoded categories plus realistic user configs won't overflow the 14-slot main deck. Adding main-deck pagination is a separate feature with different UX requirements.

### Edge Cases
- **Category exactly fits one page:** If a category's emoji count ≤ page size, no prev/next buttons are generated. The deck is identical to the current single-page layout.
- **Category exactly fills the page:** If count = page size, same as above — no prev/next. The category has exactly one full page.
- **Single emoji on a page:** Last page may have fewer than page-size emojis. That's fine — trailing empty slots show nothing (consistent with current behavior where unused positions have no buttons).
- **Empty category (0 emojis):** Not supported — no deck is generated for an empty category. This is consistent with current behavior where empty categories wouldn't make sense.
- **Favorites overflow:** Favorites are treated as a regular category for pagination purposes — same page size formula, same prev/next behavior.

### createDecks Refactoring Approach
- **Decision:** Inline pagination logic in `createDecks` — extract a local helper `splitIntoPages(items, pageSize, categoryId, label)` that returns deck definitions with prev/next buttons. No separate utility module for this phase.
- **Rationale:** The pagination logic is specific to this addon's deck format. Extracting it prematurely would create a generic utility with only one consumer. If a second consumer emerges, extract later.

### Deck ID Naming Convention
- **Decision:** Paginated category decks use IDs in the format `${deck.id}-${category.id}-p${pageNumber}` where pageNumber is 1-indexed. The page 1 deck is always generated even if it's the only page (no name change needed — single-page categories already generate `<deck.id>-<category.id>` decks).
- **Rationale:** Clear, deterministic, and doesn't require renaming existing single-page category decks.

### Agent's Discretion
- The exact SVG icon choice for prev/next buttons (if any icon is added beyond the label text).
- The CSS class/visual treatment of prev/next buttons (standard `change-deck` rendering is sufficient).
- Test coverage boundaries (must cover multi-page split, single-page, edge cases, and favorites).

</decisions>

<specifics>
## Specific Ideas

No specific requirements beyond what's in ROADMAP.md and REQUIREMENTS.md (EMO-01 through EMO-05).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase 46 success criteria (lines 57-65)
- `.planning/REQUIREMENTS.md` — EMO-01 through EMO-05 (lines 47-51)
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — Current createDecks implementation
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — Category definitions and schemas
- `packages/cli/src/deck/system-back-injection.ts` — System back button injection contract
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — Existing change-deck button type
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — Current test patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `change-deck` button type (`core-buttons/buttons/change-deck.tsx`): Handles `navigateToDeck` with `target_deck` config. Used as-is for prev/next buttons.
- System-reserved back button (`deck/system-back-injection.ts`): Already injects at `keyCount - 1`. The emoji-selector's own `emoji-back-button` at position 14 will be replaced by this.

### Established Patterns
- `createDecks` returns `Record<string, DeckDefinition>` keyed by deck ID.
- Category buttons use `navigateToDeck(config.target_deck)` for navigation.
- Deck IDs follow the convention `${deck.id}-${category.id}`.

### Integration Points
- `createDecks` in `index.ts:11-84` — The main refactoring target. Currently maps `CATEGORY_DEFINITIONS` to one deck per category.
- `CATEGORY_DEFINITIONS` in `support.tsx:7-26` — Source of category emoji arrays. Pagination logic reads from these.
- System back injection in `deck/system-back-injection.ts` — The Phase 42 system will auto-inject at position 14. The emoji-selector's own back button should NOT be placed at position 14 in category decks.

### Key Calculation
- Page size for 15-key device: `15 - 1 (system back) - 2 (prev/next) = 12 emojis per page`.
- Navigation button positions: prev at `keyCount - 3`, next at `keyCount - 2`, system back at `keyCount - 1`.

</code_context>

<deferred>
## Deferred Ideas

- Main deck category overflow pagination — not part of this phase. Categories that overflow position `keyCount - 1` on the main deck will be rejected by existing config validation.
- Rich page navigation (e.g., jump to page N, page carousel) — current prev/next design is minimal and sufficient for the expected category sizes.

</deferred>

---
*Phase: 46-emoji-selector-multi-page*
*Context gathered: 2026-06-06*
