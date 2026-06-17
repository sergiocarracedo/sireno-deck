---
phase: 72-system-buttons-dispatcher-and-deck-icon
status: discussed
---

# 72-CONTEXT

## Scope

Phase 72 ships two related fixes for the system-buttons layer:

- **BUG-03** — When an active-app overlay deck is configured with `autoShow: false`, the system back button in the base deck's last position must summon the overlay via 2xTap (the existing `SplitActionSurface` component), and the overlay's own last position must return to the base deck. The 2xTap semantics on the base deck walk the underlying base deck's history stack (equivalent to `dismissOverlay()` only when the overlay is at the root of its own history; otherwise it pops the overlay's own page history first).
- **BUG-04** — `CoreDeckConfigSchema` accepts an optional `icon?: string` field. The `icon` survives `parseRawDeck` and reaches `OverlayToggleButton`, which renders the deck's `icon` (from the addon manifest or the deck `icon` field) next to the `send-to-back` icon. A deck without an `icon` falls back to the deck-name initial or the existing `app-window` placeholder.

## 4 user decisions (from discuss-phase)

1. **BUG-03 2xTap stack action (user verbatim):** "when the user tapx2 the system button (split surface with setttings or back) in the 'regular' decks, changes to the overlay deck. The overlay deck last button tap back to regular decks (no back button or history in the overlay decks)"
   - **Plain-language: The split-action button (settings role or back role) is the entry point. Tap-twice switches from the base deck to the overlay deck. In the overlay deck, the last button is "tap back to base" (no back history inside overlays).**
   - Implementation impact: the dispatcher's 2xTap action on the base deck's system back button must call the summon overlay action (likely `summonOverlay` for `autoShow: false` overlays). The overlay's own last-position back button (which is already a back button when the overlay is shown) must call `dismissOverlay()` to return to base — no in-overlay history.

2. **BUG-03 2-line visual (user verbatim):** "just use SplitActionSurface component, dont worry about the visuals, that component manages it"
   - **Implementation: Use the existing `SplitActionSurface` component directly. No new visual variant. The component handles the diagonal split + TapIndicator chips (tap top-right, dbltap bottom-left).**
   - The 2-line layout in BUG-03 is the existing `SplitActionSurface` primary + secondary rendering. The `primary` is the back icon + "Tap" (system back), the `secondary` is the overlay deck icon + "2xTap".

3. **BUG-04 icon type (user verbatim):** "same as action button icon: lucide using 'icon:/' prefix, image, etc. IF needed extract the icon resolution as a common utitility"
   - **Implementation: `icon?: string` follows the SAME convention as the action button icon field. Reuse the existing icon-resolution utility. Extract a common utility if it doesn't already exist.**
   - This implies Phase 72 must either reuse an existing icon resolver (e.g., `resolveIcon(iconString)` in `ui/icon.tsx` or similar) or extract one. Agent's discretion: locate the existing icon resolver in the action button path, then reuse it.

4. **BUG-04 no-icon fallback (user confirmed):** "Deck-name initial, capital letter" (Recommended)
   - **Implementation: uppercase first character of deck name. e.g. "Chrome" → "C", "Slack" → "S".**
   - When the deck has no `icon` field AND no addon-manifest icon, render the first capital letter of `deck.name`. Falls back to `app-window` lucide only if `deck.name` is empty or whitespace.

## Code references for plan-phase

- `packages/cli/src/ui/surfaces/SplitActionSurface.tsx` (52 lines) — diagonal split + TapIndicator chips. Theme-overridable via `themeUi.surfaces.splitAction`. Already used in the runtime via `createElement(SplitActionSurface, { primary, secondary })`. **No changes needed to this component for Phase 72.**
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` (53 lines) — currently extracts first emoji from `activeOverlayDeck.name` via `/^\p{Extended_Pictographic}/u`. Falls back to `layout-grid` + "Show App" if no emoji. **Does NOT use the `icon` field.** Phase 72 must:
  - Accept a `icon?: string` prop (or read it from deck config / addon manifest)
  - Render the deck's `icon` next to the `send-to-back` icon
  - Apply the BUG-04 fallback (deck name initial capital) when no icon
- `packages/cli/src/core/schemas.ts` — `CoreDeckConfigSchema` at line ~213. Currently `.strict()` with no `icon` field. Phase 72 must add `icon: z.string().optional()` to `CoreDeckConfigSchema`. Verify `RawDeckSchema` is `.passthrough()` (per v1.7 research) so the YAML field already passes the parse.
- `packages/cli/src/core/schemas.ts` — existing `icon` fields at lines 75 (`ToggleStatePresentationOverrideSchema`), 82 (`ToggleSharedPresentationSchema`), 174 + 182 (button config + states). The action button `icon` resolver is the canonical pattern to reuse.
- `packages/cli/src/deck/system-buttons/system-buttons.ts` (67 lines) — `getLastPositionSystemButton` and friends. The dispatcher that returns the back/overlay-toggle button instance. Phase 72 must wire BUG-03's 2xTap action here.
- `packages/cli/src/deck/system-back-injection.ts` — the injection logic. Already handles `autoShow: false` overlay summoning via `pendingOverlayDeck`. Phase 72 likely needs to extend the 2xTap action on the system back button to call `summonOverlay` for the pending overlay.

## Agent's discretion (defaults)

- **Icon resolver location:** If the action button's icon resolver is a small inline function in `core/schemas.ts` or `addon/api.ts`, inline it in `OverlayToggleButton.tsx` with a comment-free `resolveDeckIcon(icon?: string): string` helper. If it's already a shared util (likely in `ui/icon.tsx`), import it.
- **SplitActionSurface wiring:** The runtime's `getLastPositionSystemButton` (line 1117-1131 area) currently produces a SplitActionSurface with primary (back icon) + optional secondary (overlay deck icon when `pendingOverlayDeck`). Phase 72 must confirm that when `pendingOverlayDeck` is set AND `autoShow: false`, the secondary line carries the deck's `icon` (or fallback initial) and the dbltap dispatches to `summonOverlay`.
- **Test for BUG-04:** Pin the schema change (parseRawDeck preserves `icon`) + a render test asserting the icon reaches `OverlayToggleButton`. Use the same fixture-based pattern as the system_back_*_command tests.
- **Test for BUG-03:** Pin the 2xTap action routing through the system back button to summon the overlay. The 2-line `SplitActionSurface` variant is structural — assert that when `autoShow: false` and overlay is pending, the button carries a dbltap handler that calls the summon action.

## Open questions for plan-phase

1. **Is the action button's icon resolver already extracted, or is it inline in schemas.ts?** Need to grep before deciding whether to extract a new `resolveDeckIcon` utility or reuse an existing one.
2. **Where does `summonOverlay` live?** Phase 72 must call it from the 2xTap action. Likely in `controller.ts` or `system-buttons.ts` closure.
3. **Does `RawDeckSchema` already pass `icon` through?** Per v1.7 research, `RawDeckSchema` is `.passthrough()` so YAML accepts extra fields, but `CoreDeckConfigSchema.parse()` may still drop them. Need to verify the seam.

## Deferred ideas

- Theme picker UI for overlay deck icon resolution (different icons per theme).
- Per-overlay-deck `icon` vs per-addon-manifest `icon` priority: current answer is "deck config wins" but should be confirmed in plan-phase.
- Animation when 2xTap summons the overlay (v2+ — visual polish).
- `app-window` lucide fallback when both `icon` and `deck.name` are missing (currently: only the initial capital; `app-window` is the existing behavior — keep as-is).
- Reusing the action button's icon-resolution patterns across all button types (broader refactor, out of scope).

## Notes for downstream

- Phase 71 P3-3 (settings role onDblTap wiring) shipped in `6c93d01`. Phase 72 BUG-03 directly builds on the settings role's `onDblTap` to add the summon action when an overlay is pending with `autoShow: false`. The system back's `onDblTapOverride` parameter (already in `createSystemBackHandlers` signature) is the natural injection point.
- 79 pre-existing failures in `runtime.test.ts` from Phase 42/67 system-back-injection. Phase 72 must NOT regress this baseline. The dispatcher test should use the same pattern as `routes the split-action tap/press through system_back_*_command` (line 3963+ in `__tests__/runtime.test.ts`).
- Wave ordering: BUG-04 (schema + OverlayToggleButton) can ship first as a small Wave 1; BUG-03 (dispatcher 2xTap action) needs BUG-04's icon field available so it can render the secondary line with the deck icon. Wave 2: BUG-03 dispatcher. Or single plan covering both if plan-phase finds the surface small enough.
