# Phase 46: Emoji-Selector Multi-Page — Discussion Log

**Date:** 2026-06-06
**Mode:** standard
**Participants:** User + Agent

## Summary

The user selected "All clear — skip discussion" when presented with five gray areas. Implementation decisions were derived from the existing requirements (EMO-01 through EMO-05), ROADMAP.md success criteria, and established codebase patterns. No live discussion was needed.

## Areas Considered

### 1. Prev/Next Button Placement

**Options considered:**
- **A (chosen):** Fixed positions at end — prev at `keyCount-3`, next at `keyCount-2`, system back at `keyCount-1`. Emojis fill `[0..keyCount-4]`.
- **B:** Prev at position 0, emojis at `[1..keyCount-3]`, next at `keyCount-2`, back at `keyCount-1`.
- **C:** Flexible/configurable positions.

**Rationale for A:** Keeps emoji entries contiguous and navigable (no gap at the start). Navigation controls are always at a predictable trailing location.

### 2. Page Indicator UX

**Options considered:**
- **A (chosen):** Page number embedded in prev/next button labels — e.g., prev label `"‹ Page 2"`, next label `"Page 3 ›"`.
- **B:** Separate non-interactive indicator button showing `"2 / 3"`.
- **C:** No page indicator at all.

**Rationale for A:** Self-documenting without consuming extra button slots. The current page is always derivable from what the adjacent buttons say.

### 3. Main Deck Category Overflow

**Options considered:**
- **A (chosen):** Deferred — not scoped to Phase 46. Categories exceeding `keyCount - 1` are rejected by config validation.
- **B:** Paginate main deck categories too with prev/next.
- **C:** Scroll or nested category grouping.

**Rationale for A:** Separate feature with different UX. Current 3 categories won't overflow. No requirement for this in EMO-01 through EMO-05.

### 4. Edge Cases

**Options considered:**
- **A (chosen):** Categories ≤ page size → no prev/next. Empty categories → no deck generated. Favorites treated as regular category.
- **B:** Always show prev/next (greyed out if single page).
- **C:** Create empty page with prev/next for 0-emoji categories.

**Rationale for A:** Minimal approach. Single-page behavior matches current user experience. Empty categories have no meaningful deck.

### 5. createDecks Refactoring Approach

**Options considered:**
- **A (chosen):** Inline pagination helper within `createDecks`.
- **B:** Extract generic `splitIntoPages` utility module.
- **C:** Move all deck generation to a separate builder class.

**Rationale for A:** The pagination logic is specific to this addon. Premature extraction without a second consumer creates unused abstractions.

### 6. Deck ID Naming

**Options considered:**
- **A (chosen):** `${deck.id}-${category.id}-p${pageNumber}` (1-indexed).
- **B:** `${deck.id}-${category.id}-page-${pageNumber}`.
- **C:** `${deck.id}-${category.id}-${pageNumber}` (0-indexed).

**Rationale for A:** Concise. 1-indexed matches user-facing page numbers. Pattern is consistent with existing `${deck.id}-${category.id}` naming.

## Agent's Discretion Areas

- SVG/icon choice for prev/next buttons beyond label text
- CSS treatment of prev/next buttons (standard change-deck rendering)
- Test coverage boundaries and naming patterns

## Deferred Ideas

- Main deck category overflow pagination — future phase
- Rich page navigation (jump to page N, carousel) — not needed for expected category sizes
