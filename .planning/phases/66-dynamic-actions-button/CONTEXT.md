# Phase 66 — SplitActionSurface (was DynamicActionsButton)

## What We're Building

A new `SplitActionSurface` component that replaces three system-button implementations with a single configurable surface. It renders either one or two "sub-surfaces" in a diagonal `/` split layout, where tap triggers the primary action and dbl-tap triggers the secondary action.

## Design Decisions

### Location
`src/ui/surfaces/SplitActionSurface.tsx` — a new surface component in the surfaces directory (not a system-button helper in deck/system-buttons/).

### API
Props-based:
```tsx
interface SplitActionSurfaceProps {
  primary: ReactElement   // always rendered
  secondary?: ReactElement // optional; when absent → single-surface mode
}
```
The component accepts two sub-surfaces as **props**, not as children. This avoids ambiguity about which child goes where.

### Modes
- **Mode 1 (single surface)**: Only `primary` provided. Tap triggers `onTap`, dbl-tap is a no-op.
- **Mode 2 (dual surface)**: Both `primary` and `secondary` provided. Tap triggers `onTap`, dbl-tap triggers `onDblTap`.

### Diagonal Split
- `/`-style division: top-right triangle = primary, bottom-left triangle = secondary
- Split runs only **25%** of the diagonal length (centered), so each sub-surface occupies a roughly triangular region at the corner
- The diagonal is aesthetic/functional — each region is independently tappable via gesture routing

### Scaling
- Each sub-surface is **scaled to fit** its triangular region via CSS `transform`
- The original surface components know nothing about scaling; they render at full size and get clipped/scaled by the `SplitActionSurface` wrapper
- This preserves existing surface components as reusable primitives

### Replacement Targets
The `SplitActionSurface` replaces all three of these system-button patterns:
1. **`SystemBackButton`** — single surface (back action, no overlay)
2. **`SystemBackWithPendingOverlayButton`** — dual surface with pending overlay badge (back + summon)
3. **`SystemSettingsEntryButton`** badge pattern — dual action with overlay badge hint

The runtime dispatcher (`system-buttons.ts`) will inject a new button type that the runtime maps to `<SplitActionSurface>` with the appropriate primary/secondary props, replacing the three bespoke components.

### Naming
The component is named `SplitActionSurface`:
- "Split" — the visual split between two actions
- "Action" — each side is an action
- "Surface" — consistent with existing surfaces (MainLabelSurface, BarsSurface, etc.)

The original phase title "DynamicActionsButton" was a working title during discussion; the implementation should use `SplitActionSurface`.

## Integration Points

1. **New surface**: `src/ui/surfaces/SplitActionSurface.tsx`
2. **System buttons dispatcher** (`system-buttons.ts`): New button type constant + decision branch that returns `SplitActionSurface` config instead of the old button types
3. **Runtime wiring** (`runtime.ts`): Map the new button type to `<SplitActionSurface>`, passing primary/secondary sub-surfaces as props
4. **Exports**: Add `SplitActionSurface` to `ui/index.ts`

## Gray Areas Resolved

| Gray Area | Decision |
|-----------|----------|
| Component location | `src/ui/surfaces/` |
| API shape | Props-based, `primary` + `secondary` |
| Children vs props | Props (no children) |
| Mode 1 dbl-tap | No-op |
| Diagonal orientation | `/` (top-right primary, bottom-left secondary) |
| Diagonal depth | 25% of diagonal length, centered |
| Scaling approach | CSS `transform` on original surfaces |
| Replaces | SystemBackButton, SystemBackWithPendingOverlayButton, SystemSettingsEntryButton badge |
| Name | `SplitActionSurface` |

## Requirements (to formalize in PLAN.md)

Req 1: `SplitActionSurface` accepts `primary: ReactElement` and optional `secondary: ReactElement`.
Req 2: With only `primary`, renders a single full-surface layout; dbl-tap is no-op.
Req 3: With both `primary` and `secondary`, renders a `/` diagonal split with primary in top-right, secondary in bottom-left.
Req 4: The diagonal split covers 25% of the diagonal, centered.
Req 5: Sub-surfaces are scaled via CSS `transform` to fit their region.
Req 6: The dispatcher injects a new button type that routes to `SplitActionSurface`.
Req 7: The old system-button components are removed after migration.
