# Phase 5: Overlay Decks - Context

**Gathered:** 2026-07-17
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

Decks can declare a `trigger` (process name + optional window-name glob, both optional, AND-combined) and surface as an overlay layer when the active window matches. The runtime flips between a regular layer (with its own nav history) and an overlay layer (per-deck isolated nav history). A single n-1 SplitSurface on every non-main deck offers **back** (within current layer) + **overlay-toggle** (dbltap to flip layers). When the toggle side is on an overlay deck it is decorated with the matched overlay deck's icon.

A dedicated **lock deck** path is **out of scope** for this phase.

</domain>

<decisions>
## Implementation Decisions

### Trigger matching
- A deck's `trigger` has two optional fields: `process_name` and `window_name`.
- AND between fields: both configured fields must match.
- OR within a field: any pattern in the array matches.
- A field with no patterns is considered "passing" (lets `process_name`-only or `window_name`-only triggers work).
- Patterns are globs (`*`, `?`, `|`, case-insensitive). No regex syntax. Field name stays `window_name` (not `window_title`).
- When multiple overlays match the same active app, the **most specific** wins (both-field trigger beats single-field); tie-break by config declaration order (first wins).

### autoShow
- `autoShow` defaults to `false`. `false` means "available but not shown" — the n-1 SplitSurface surfaces the overlay-toggle, but the layer stays on the regular deck until the user dbltaps.
- `autoShow: true` flips the layer automatically the moment the trigger matches (no user gesture required).

### Nav history isolation
- Regular layer uses a single `navStack: string[]`.
- Each overlay deck has its **own** isolated `overlayNavStacks: Map<overlayDeckId, string[]>`.
- When an overlay deck is dismissed its stack is **preserved for the rest of the session** — re-activating that deck later restores where the user was.
- Empty overlay history: tap-back on the overlay root **dismisses the overlay** and returns to the regular layer.

### n-1 SplitSurface shape
- Every non-main deck (regular OR overlay) gets a SplitSurface at n-1, with **back** primary + **overlay-toggle** secondary.
- The SplitSurface is rendered whenever `hasOverlayDeckAvailable` is true; for the overlay layer it stays visible because the overlay is, by definition, the available overlay.
- Primary action: tap on `core:back` — pops the active layer's history (regular navStack or this overlay's stack). Empty stack → dismiss overlay.
- Secondary action: **dbltap** on `core:overlay-toggle` — flips layers. Rendered with the matched overlay deck's icon.

### OverlayToggle icon
- Runtime plumbs a new field on the `deck-config` protocol message: `overlayDeckIcon` (nullable).
- Frontend `Deck.tsx` reads `overlayDeckIcon` and passes it to `renderSystemButton` for the SplitSurface secondary slot.
- Falls back to the static `icon://layers` when no overlay is currently matched.

### Back-button onhold
- Inside an overlay layer, **hold** on `core:back` jumps to `navStack[0]` (the isMain deck) and dismisses the overlay.
- Inside the regular layer, hold on `core:back` keeps current behaviour (no-op or pop-to-root, per existing semantics — to be confirmed by planner).

### System-button gesture wiring
- The `useButtonAction` bridge must be extended to dispatch `dbl-tap` and `hold` gestures for system-button positions, not just `tap`. The runtime must accept these gestures and route them to the appropriate handler:
  - `core:overlay-toggle` + dbl-tap → toggle layer
  - `core:back` + hold (in overlay) → jump to main deck

### Agent's Discretion
- Exact frontend rendering of the matched deck icon inside the SplitSurface (sizing, fallback chain).
- Whether the SplitSurface dbltap indicator stays `dbltap` or flips to `tap` once the toggle becomes the primary affordance (recommendation: keep `dbltap` — explicit affordance).
- Polling interval for active-app snapshot (currently 1s) and debounce (200ms) — keep current values unless measured to be problematic.

</decisions>

<specifics>
## Specific Ideas

- "this surface must use the deck icon and trigger on dbltap" — explicit per user spec. The matched overlay deck's `icon` (e.g. `/works/.../chrome.svg` in the example) must appear on the secondary side of the SplitSurface; dbltap is the gesture.
- "Back button onhold gesture must navigate to deck layer main deck" — explicit. The `core:back` button's `hold` action, when pressed while an overlay layer is active, exits to the regular layer's `isMain` deck.
- The user's example config uses `window_title` (with a JS regex literal). We chose to **not** rename the field or adopt regex syntax — globs cover the same Spotify-on-chrome case via `*Spotify*`.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase 5 success criteria & tasks (authoritative scope).
- `packages/cli/src/deck/runtime.ts` — existing overlay state, `setOverlay`, active-app poll loop, `applyOverlay`, `computeOverlayFor`.
- `packages/cli/src/deck/system-back-injection.ts` — current n-1 button selector (needs SplitSurface for overlay decks too).
- `packages/cli/src/system/glob-match.ts` — current glob matcher (needs AND-semantics refactor across fields).
- `packages/cli/src/api/protocol-internal.ts` — `deckConfigMessageSchema` (needs `overlayDeckIcon` field), `showOverlayMessageSchema`, `dismissOverlayMessageSchema`.
- `packages/cli/frontend/src/components/Deck.tsx` — current SplitSurface rendering when `hasOverlayDeckAvailable`; gesture hook.
- `packages/cli/src/ui/surfaces/SplitActionSurface.tsx` — already exists; render path for back + overlay-toggle.
- `packages/cli/src/deck/system-buttons/registry.tsx` — current static button metadata (`core:back`, `core:overlay-toggle`).
- `.planning/phases/05-overlay-decks/05-DISCUSSION-LOG.md` — full audit trail of all options considered.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`SplitActionSurface`** (`packages/cli/src/ui/surfaces/SplitActionSurface.tsx`): already renders two surfaces in a split with a tap/dbltap indicator. Drop-in for the n-1 cell — no new UI primitive needed.
- **`core:overlay-toggle`** system button type: already in `SYSTEM_BUTTON_TYPES`. Only the icon and gesture wiring are missing.
- **`setOverlay` / `getOverlay` / `hasOverlayDeckAvailable`** on Runtime: already exposed. `setOverlay` is wired for the autoShow path inside `applyOverlay` — for `autoShow=false` decks the runtime still calls `applyOverlay` because `applyOverlay` doesn't read `autoShow` at all (gap to fix).
- **`compileDeckMatcher`** in `system/glob-match.ts`: already used by `computeOverlayFor`. Needs to be reshaped to take per-field patterns and AND them.

### Established Patterns
- **System buttons** are surfaced through `renderSystemButton(type)` which reads from the `system-buttons/registry.tsx` map. Adding dynamic icon support means the renderer needs to accept an override prop.
- **Protocol messages** are zod-defined in `protocol-internal.ts` and validated on both ends. New fields go through the `deckConfigMessageSchema`.
- **Gesture plumbing** currently goes through `useButtonAction(deckId, position).fire(gesture)` in `Deck.tsx`. The system-button handlers need to dispatch `dbl-tap` and `hold`, not just `tap`.
- **PubSub events**: `runtime:overlay`, `runtime:activeDeck`, `runtime:deck-inactive` already exist. Reuse for layer flips and per-deck stack pushes.

### Integration Points
- `runtime.ts` is the single integration point for: per-overlay-deck nav stack, AND-semantics matcher call, `autoShow` gating, dbltap/hold routing on system buttons.
- `system-back-injection.ts` must change: an `isOverlay` deck currently returns a single `core:overlay-toggle`; it should still produce a `core:back` (so the frontend renders SplitSurface), with the SplitSurface's secondary side auto-rendered by the frontend because `hasOverlayDeckAvailable` is true.
- `deck-config` protocol message gains `overlayDeckIcon`; emulator and real output clients need no changes (they forward raw config).

</code_context>

<deferred>
## Deferred Ideas

- **Lock deck** (mentioned in the architecture notes but excluded from this phase). Belongs to its own phase.
- **Per-overlay custom toggle icon override** (e.g. a deck can set a separate `overlayToggleIcon` distinct from its main `icon`). Keep using the deck's main `icon` for now; override belongs in a future overlay-polish phase.
- **Animation / flash** when overlay layer activates or dismisses. Visual polish — separate phase.
- **Disambiguation UI** when multiple overlays match. Currently the most-specific rule is silent; no picker. Add later if needed.

</deferred>

---

*Phase: 05-overlay-decks*
*Context gathered: 2026-07-17*
