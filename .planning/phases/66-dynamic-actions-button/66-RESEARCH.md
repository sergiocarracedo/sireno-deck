# Phase 66 Research — SplitActionSurface

## Don't Hand-Roll

### CSS clip-path for diagonal splits
Use `clip-path: polygon()` rather than SVG clip paths or canvas rendering. `polygon()` is widely supported (Baseline 2020), lightweight, and composable with CSS transforms. **Do not hand-roll a clip-path polyfill** — the browser handles it natively. [VERIFIED: MDN]

For a `/` diagonal split (bottom-left to top-right) with a 25%-centered segment:
- Diagonal endpoints: `(37.5%, 62.5%)` to `(62.5%, 37.5%)`
- Primary (top-right): `clip-path: polygon(100% 0%, 100% 100%, 62.5% 37.5%, 37.5% 62.5%)`
- Secondary (bottom-left): `clip-path: polygon(0% 100%, 0% 0%, 37.5% 62.5%, 62.5% 37.5%)`

### CSS transform for sub-surface scaling
Use `transform: scale(X)` rather than JavaScript-based sizing calculations. The scale factor equals the fraction of the button that each sub-surface occupies. For example, each triangular region occupies roughly half the button area, so each sub-surface scales to ~70% (sqrt(0.5)). [VERIFIED: MDN]

**Important:** The `transform-origin` must be set to the corner where the sub-surface is anchored (top-right for primary, bottom-left for secondary) to prevent misalignment after scaling.

## Common Pitfalls

### Pitfall 1: clip-path + overflow interaction
`clip-path` on a parent does NOT clip child content that overflows the parent via `position: absolute` unless the parent establishes a containing block. Use `position: relative` on the clipped container and ensure `overflow: hidden` is set for safety. [CITED: MDN clip-path docs]

### Pitfall 2: Transform origin misalignment
When scaling content to fit a clipped region, `transform-origin` must match the clipped corner. If `transform-origin` defaults to `center`, scaled content will shift away from the corner it should anchor to. Set explicitly:
- Primary (top-right): `transform-origin: top right`
- Secondary (bottom-left): `transform-origin: bottom left`

### Pitfall 3: Gesture routing ambiguity
Tap vs. dbl-tap routing does NOT need per-region hit detection. The existing runtime gesture handler (400ms dbl-tap timer) determines whether a tap becomes a single-or double-tap gesture. The `SplitActionSurface` only needs `onTap`/`onDblTap` handlers passed through — no hit-testing on the diagonal. The current SystemBackWithPendingOverlayButton already demonstrates this pattern.

### Pitfall 4: Stacking context from clip-path
`clip-path` with a value other than `none` creates a new stacking context (same as `opacity` or `transform`). This means each clipped sub-surface forms its own stacking context. If you need z-ordering between primary and secondary, the one rendered last in DOM order will be on top. Render primary first, secondary second so secondary overlaps primary on the diagonal line.

### Pitfall 5: Sub-surface content overflow
Original surfaces (MainLabelSurface, etc.) expect full-button dimensions. Scaling them down may cause text truncation or icon misalignment. Test with real content: "Back" label with `undo2` icon, overlay deck badge text.

## Existing Patterns in This Codebase

### Surface pattern (src/ui/surfaces/)
All surfaces follow the same convention:
- Component function in `src/ui/surfaces/`
- Props interface exported
- Optional `useThemeUiPresentation()` for theme overrides
- Exported from `ui/index.ts`

**MainLabelSurface** (54 lines) is the most relevant — it renders icon/emoji + label vertically stacked. This is what gets placed inside SplitActionSurface as primary/secondary sub-surfaces.

### System button dispatcher (deck/system-buttons/system-buttons.ts)
Three button types injected at the last position:
1. `OVERLAY_TOGGLE_TYPE` — when currently viewing an overlay/paged deck
2. `SYSTEM_SETTINGS_TYPE` — on main deck when settings exists, carries overlay badge info
3. `SYSTEM_BACK_WITH_PENDING_OVERLAY_TYPE` — 2-line back+summon when pending overlay
4. `system-back` — plain back button

A new type constant replaces all three bespoke types except OVERLAY_TOGGLE (which has different semantics — it dismisses the overlay, not navigates).

### Runtime wiring (deck/runtime.ts)
Button type → React component mapping in `instantiateRuntimeButtonInstance()`. Each type maps to `createElement(Component, props)`. The SplitActionSurface wiring would add a new case here that constructs `<SplitActionSurface primary={...} secondary={...} />` with the correct sub-surfaces.

### Gesture handling (runtime.ts)
Dbl-tap detection uses a 400ms timer (`DOUBLE_TAP_DELAY_MS`). Single tap fires after 400ms of no second press; dbl-tap fires immediately on second press. The system back button's `onDblTap` handler already uses this mechanism for the summon action.

## Recommended Approach

### Plan breakdown (2 vertical slices):

**Plan 1: SplitActionSurface component**
- New `SplitActionSurface` in `src/ui/surfaces/`
- Props: `primary: ReactElement`, `secondary?: ReactElement`, `onTap`, `onDblTap`
- Mode 1 (no secondary): renders primary at full size, dbl-tap is no-op
- Mode 2 (both): `/` diagonal split using `clip-path: polygon()` + CSS `transform: scale()` on each sub-surface
- Theme override support via `useThemeUiPresentation()`
- Unit test (render mode 1, render mode 2, scaling behavior)
- Export from `ui/index.ts`

**Plan 2: System button migration**
- Add `SPLIT_ACTION_TYPE` constant to `system-buttons.ts`
- Inject `SPLIT_ACTION_TYPE` instead of `system-back`, `system-back-with-pending-overlay`, and `system-settings` where applicable
- Wire `SPLIT_ACTION_TYPE` in runtime.ts → maps to `<SplitActionSurface>` with correct sub-surfaces (MainLabelSurface for back/settings, badge variant for overlay hint)
- Remove `SystemBackWithPendingOverlayButton.tsx` and `SystemSettingsButton.tsx` dead code, simplify `SystemSettingsEntryButton.tsx` badge to use SplitActionSurface
- Update existing overlay lifecycle tests (5 tests in runtime.test.ts) to assert on `SPLIT_ACTION_TYPE` instead of removed types
- Verify all tests pass, CLI starts clean
