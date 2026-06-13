# Phase 61: Icon updates — Context

**Gathered:** 2026-06-12
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Update two system buttons to match the v1.6 design language:

1. **System back button** (ICON-01): swap the current `chevron-left` lucide icon for `undo2` (a more semantically accurate "go back" gesture).

2. **Overlay toggle button** (ACTIVEAPP-08): replace the current static `app-window` icon + "Toggle App" label with a context-aware rendering that shows the active overlay deck's icon as a small "badge" overlaid on a `send-to-back` lucide icon, plus the overlay deck's name as the label.

The work splits into a trivial Part A (system back swap, ~1 file) and an architectural Part B (overlay toggle becomes a mounted, state-aware button, ~3-4 files).

**Out of scope:** any new icons for other buttons, the auto-show mode behavior (Phase 62), the chrome overlay deck extensions (Phase 64).

</domain>

<decisions>
## Implementation Decisions

### Active overlay data source
- **Pass `overlayDeckId` and `overlayDecks` (or the active deck config) into the button's render props.** The current `OverlayToggleButton` is a stateless component with no awareness of the active overlay. To show the active deck's icon and name, the button needs to be converted to a mounted button that receives the active overlay state via render props. The runtime already tracks `overlayDeckId`; it just needs to be passed to the button.
- When no overlay is active (`overlayDeckId === null`), the button falls back to a neutral state (just the `send-to-back` icon, no deck badge, no deck name).

### Dual-icon layout
- **Overlay (send-to-back background + deck badge foreground).** The `send-to-back` lucide icon is rendered as a background layer (larger, muted color). The active overlay deck's icon (or first emoji char if no icon) is rendered as a smaller foreground "badge" overlaid on the bottom-right of the send-to-back icon. This visually represents the "send this app to back" gesture with the target app identified.
- The label below the icon shows the active overlay deck's name (e.g., "Chrome", "Spotify"). When no overlay is active, the label is "Show App" or omitted.
- Implementation: a small dedicated render function (not a generic component) since the layout is specific to this one button.

</decisions>

<specifics>
## Specific Ideas

- The `send-to-back` lucide icon visually reads as "send this layer/element to the back of the stack" — semantically aligned with the overlay toggle's behavior (deactivate the active overlay, returning the user to the main deck).
- The deck badge is a small (e.g., 14×14px) circular or square icon positioned at the bottom-right of the larger `send-to-back` icon. This is a common visual pattern for "action target" affordances.
- The existing 2-line variant of the system back button (from Phase 62's `autoShow: false` mode) already uses a similar dual-element layout — the overlay toggle could share a `DualBadge` or `Overlay` sub-component, but that's out of scope for this phase (YAGNI; the overlay toggle's specific layout can be inlined).

</specifics>

<canonical_refs>
## Canonical References

- `packages/cli/src/deck/system-buttons/SystemBackButton.tsx` — current chevron-left usage (line 16: `name: backIconOverride ?? 'chevron-left'`). One-line change for Part A.
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` — current static `app-window` icon + "Toggle App" label. Needs to be converted to a mounted button for Part B.
- `packages/cli/src/deck/runtime.ts` — tracks `overlayDeckId` (the currently active overlay). The runtime's render path for system buttons needs to pass this to the overlay toggle.
- `packages/cli/src/ui/index.ts` — re-exports `MainLabelSurface` (from Phase 59 GC4). NOT appropriate for the overlay toggle's dual-icon design — needs a custom render. The single-icon system back swap CAN still use `MainLabelSurface` (just with a different `main` value).
- `packages/cli/src/ui/Icon.tsx` — `<Icon name="..." />` resolves lucide icon names. Both `undo2` and `send-to-back` are valid lucide-react names.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `<Icon>` (`packages/cli/src/ui/Icon.tsx`) — generic lucide-react icon. Use for both `undo2` (system back) and `send-to-back` (overlay toggle background).
- `MainLabelSurface` (Phase 59 GC4) — fine for the system back button (single icon + label). NOT appropriate for the overlay toggle (needs custom dual-element layout).
- `defineMountedButton` (`packages/cli/src/addon/api.ts`) — the API for defining a mounted button. Used by other mounted buttons. Will be used to convert `OverlayToggleButton` from a stateless component to a mounted button.
- Runtime's `renderRuntimeButton` and `buildRenderedButtons` already iterate over all system buttons; the overlay toggle is one of them. Conversion to mounted means it gets access to the same render props (config, hostContext, methods, store) plus we can thread the active overlay state through.

### Established Patterns
- The system back button is currently a **mounted** button (it uses `defineMountedButton`); converting the overlay toggle to mounted follows the same pattern.
- The runtime's `activeOverlayDeckId` is mutated via `setOverlayDeckId(...)` and read in render. It's part of the runtime's "view state" that the button needs access to.
- The Phase 62 `autoShow: false` design adds a 2-line variant to the system back button (when `autoShow: false` on a deck with `process_names`). The overlay toggle is the "inverse" — it activates an overlay rather than navigating back.

### Integration Points
- The runtime's render path for system buttons must be updated to pass the active overlay state to the overlay toggle. This is a single render-prop addition.
- The `OverlayToggleButton` itself must be rewritten as a `defineMountedButton` (or similar) so it has access to runtime state.
- No changes to `core/pagination.ts` or other downstream consumers.

</code_context>

<deferred>
## Deferred Ideas

- **Shared `DualBadge` or `OverlayIcon` component** between the system back button (Phase 62 2-line variant) and the overlay toggle. They have similar visual patterns but are out of scope for this phase. A future cleanup could extract the shared pattern.
- **Animations on the overlay toggle** (e.g., a subtle slide-in/slide-out when the active overlay changes). Out of scope for v1.6 — the button just re-renders with the new icon/name when the active overlay changes.
- **Configurable overlay toggle position**. The overlay toggle is always in the system-back slot (position 14) when an overlay is active. Out of scope.

</deferred>

---

*Phase: 61-icon-updates*
*Context gathered: 2026-06-12*
