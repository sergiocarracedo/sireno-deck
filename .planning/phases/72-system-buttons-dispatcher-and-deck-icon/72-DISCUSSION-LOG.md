# 72-DISCUSSION-LOG

## Gray area 1: BUG-03 2xTap stack action

**Options considered:**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| A. Summon-only | 2xTap on base deck's system back → `summonOverlay`. Overlay has no own back; tap returns to base. | Simplest. Matches user's plain-language answer. |
| B. Walk base + overlay stacks | 2xTap on base → walk both stacks (pop overlay's own page history first, then pop base if overlay was at root). | Matches the BUG-03 REQUIREMENTS.md text. More complex. |
| C. Just dismissOverlay | 2xTap → `dismissOverlay()` only. | Doesn't handle overlay-internal page history. Incomplete. |

**User answer (verbatim):** "when the user tapx2 the system button (split surface with setttings or back) in the 'regular' decks, changes to the overlay deck. The overlay deck last button tap back to regular decks (no back button or history in the overlay decks)"

**Plain-language: The split-action button (settings role or back role) is the entry point. Tap-twice switches from the base deck to the overlay deck. In the overlay deck, the last button is "tap back to base" (no back history inside overlays).**

**Decision: Option A (summon-only).** The 2xTap on the base deck's system back button calls `summonOverlay` for the pending overlay (when `autoShow: false`). The overlay's own last-position back button calls `dismissOverlay()` to return to base. No in-overlay history.

**Why not Option B:** The REQUIREMENTS.md text mentions walking both stacks, but the user's plain-language answer clarifies there is no in-overlay history — the overlay is a single deck that returns to base on back. Option A is the simpler and clearer implementation that matches the user's intent.

**Agent's note for plan-phase:** Verify the existing `summonOverlay` function signature. It likely lives in the controller or in `system-back-injection.ts`. The 2xTap action should be wired through `onDblTapOverride` in `createSystemBackHandlers` (already supported in the signature) or via the settings role's `onDblTap` (Phase 71 P3-3 added this).

---

## Gray area 2: BUG-03 2-line visual

**Options considered:**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| A. New visual variant | Create a 2-line `SplitActionSurface` variant. | Adds new surface code. BUG-03 requirement text mentions "2-line variant". |
| B. Reuse existing SplitActionSurface | Use the existing component with primary (back icon) + secondary (overlay deck icon). The existing component already renders two halves. | No new code. Existing component already supports the "2-line" layout. |

**User answer (verbatim):** "just use SplitActionSurface component, dont worry about the visuals, that component manages it"

**Decision: Option B (reuse existing component).** No new visual variant needed. The existing `SplitActionSurface` (52 lines) renders primary (top-left) + secondary (bottom-right) with diagonal split and TapIndicator chips. The 2-line description in the REQUIREMENTS.md text is just the user's plain-language description of the existing component's appearance.

**Agent's note for plan-phase:** Confirm that the existing `SplitActionSurface` accepts a `secondary` element with the right props for rendering the overlay deck icon. The current system back button (role: 'back') already uses `secondary` when `pendingOverlayDeck` is set. Phase 72 likely only needs to ensure the secondary element renders the deck's `icon` (from BUG-04) instead of just the `send-to-back` lucide.

---

## Gray area 3: BUG-04 icon type

**Options considered:**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| A. Simple string, parse at render | `icon: 'icon:chrome'`, render resolves to lucide. Simple to implement. | Reuse if the action button already does this. |
| B. Same as action button icon, with `icon:` prefix convention | `icon: 'icon:chrome'` for lucide, `icon: '/path/to/image.png'` for file. | Consistent with the action button icon field. The user wants this. |
| C. Resolved object | `icon: { type: 'lucide', name: 'chrome' }`. | More verbose, no benefit. |

**User answer (verbatim):** "same as action button icon: lucide using 'icon:/' prefix, image, etc. IF needed extract the icon resolution as a common utitility"

**Decision: Option B (same as action button icon, extract common utility if needed).** `icon?: string` follows the SAME convention as the action button icon field. The user explicitly mentioned extracting a common utility if one doesn't exist.

**Agent's note for plan-phase:** Before writing the schema change, grep for the existing action button icon resolver. It may already be a shared utility (likely in `ui/icon.tsx` or `addon/api.ts`) or inline in schemas.ts. If inline, extract it to a shared location (e.g., `packages/cli/src/ui/resolve-icon.ts` or similar) so `OverlayToggleButton` can reuse it without duplicating logic.

**Schema placement decision:** Add `icon: z.string().optional()` to `CoreDeckConfigSchema` (line ~213). This is the user's confirmed location from the v1.7 research decisions (m0021: "Deck-level icon?: string").

---

## Gray area 4: BUG-04 no-icon fallback

**Options considered:**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| A. Deck-name initial, capital letter | "Chrome" → "C", "Slack" → "S". | Simple, no asset required. |
| B. `app-window` lucide icon | Existing behavior in OverlayToggleButton fallback. | Generic, no deck identity. |
| C. First emoji from deck name (current OverlayToggleButton behavior) | Extract `/^\p{Extended_Pictographic}/u`. | Already used. If user doesn't name decks with emoji, falls through to `layout-grid`. |
| D. First letter + `app-window` background | Composite icon. | More work, unclear benefit. |

**User answer (verbatim):** "Deck-name initial, capital letter" (Recommended)

**Decision: Option A (deck-name initial, capital letter).** Phase 72's `OverlayToggleButton` renders the uppercase first character of `deck.name` when neither `deck.icon` nor an addon-manifest icon is set. This replaces the current `layout-grid` + "Show App" fallback for the no-icon case.

**Fallback chain (final):**
1. `deck.icon` (from BUG-04 schema)
2. Addon manifest icon (if applicable)
3. Deck name initial capital letter
4. `app-window` lucide (only if deck.name is empty/whitespace)

**Agent's note for plan-phase:** The current OverlayToggleButton already extracts emoji from deck name (line 22-26 area). This is a different fallback chain (emoji → `layout-grid`). Phase 72 should replace this with the new chain above, OR keep emoji extraction as a higher-priority step before deck-name initial. User said "deck name initial" so emoji extraction is no longer the primary fallback.

---

## Deferred ideas (captured for future phases)

- Theme picker UI for overlay deck icon resolution.
- Per-overlay-deck `icon` vs per-addon-manifest `icon` priority: plan-phase to confirm.
- Animation on 2xTap summon.
- Reusing the icon resolver across all button types (broader refactor).

## Cross-plan considerations

- Phase 71 P3-3 (`6c93d01`) added `onDblTap` to the settings role of `SplitActionSurface`. BUG-03 builds on this to wire the summon action.
- Phase 71 Wave 1 (`c60ec37`) extracted `dispatchGestureEnd` to `packages/cli/src/deck/gesture-state.ts`. Phase 72 should not modify this helper.
- 79 pre-existing `runtime.test.ts` failures from Phase 42/67 system-back-injection. Phase 72 must not regress.
- `RawDeckSchema` is `.passthrough()` per v1.7 research. Phase 72 must verify that adding `icon` to `CoreDeckConfigSchema` is the right seam (not adding to `RawDeckSchema`).

## Notes for downstream

- **Wave ordering:** BUG-04 (schema + OverlayToggleButton) is a small, independent Wave 1. BUG-03 (dispatcher 2xTap action) needs BUG-04's icon field available so the secondary line renders the deck icon. Wave 2: BUG-03 dispatcher. Or single plan if surface is small.
- **Test pattern:** Use the system_back_*_command test pattern from `__tests__/runtime.test.ts:3963+` for the dispatcher test.
- **Icon resolver extraction:** If a shared utility is extracted, it should be at `packages/cli/src/ui/resolve-icon.ts` or similar — agent's discretion based on where existing icon resolution lives.
