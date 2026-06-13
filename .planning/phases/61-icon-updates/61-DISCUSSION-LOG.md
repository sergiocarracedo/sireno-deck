# Phase 61: Icon updates — Discussion Log

**Gathered:** 2026-06-12
**Mode:** standard

## Areas discussed

### 1. How should the overlay toggle button get the active overlay deck info?

**Question:** How should the overlay toggle button know which overlay deck is active to show its icon/name?

**Options considered:**
- **A) Render props (chosen)** — pass `overlayDeckId: string | null` and `overlayDecks: Record<string, DeckConfig>` into the button's render props.
- B) `useActiveOverlay()` hook from the runtime
- C) Re-resolve from `deckController` state

**User rationale for A:** Cleanest — no new hook API, no runtime introspection. Matches the existing pattern of passing deck data through render props (other mounted buttons follow the same pattern). The runtime already tracks `overlayDeckId`; it just needs to be passed through.

### 2. How should the dual-icon look be rendered?

**Question:** How should the `send-to-back` + overlay-deck-icon combo be rendered visually?

**Options considered:**
- **A) Stacked vertically** — small `send-to-back` on top, deck icon below, label under both.
- B) Side-by-side — `send-to-back` on left, deck icon on right.
- **C) Overlay (send-to-back background + deck badge foreground) (chosen)** — `send-to-back` as larger background layer, deck icon as smaller foreground "badge" at bottom-right.
- D) Fall back to send-to-back only when no overlay is active.

**User rationale for C:** Visually represents the "send this app to back" gesture with the target app identified. Common visual pattern for "action target" affordances. The label below shows the deck name (e.g., "Chrome", "Spotify").

## Agent's Discretion

- **What to show when no overlay is active** (agent's discretion per Decision 1). Recommended: a neutral state with just the `send-to-back` icon, no deck badge, and a generic "Show App" label or omitted label. The exact fallback design is a minor detail for the executor.
- **Exact pixel sizes** for the badge (e.g., 14×14px in a 30×30 background). Standard lucide icon sizing applies.

## Deferred ideas

- Shared `DualBadge` component between system back (Phase 62 variant) and overlay toggle — out of scope.
- Animations on overlay change — out of scope.
- Configurable overlay toggle position — out of scope.

---

*Phase: 61-icon-updates*
*Context gathered: 2026-06-12*
