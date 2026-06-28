# Plan 13-02 Summary

**Completed:** 2026-06-28

## What was built

Re-implemented all 5 theme components and 4 surfaces to align with legacy patterns:

- **ButtonFrame**: uses `border-frame` instead of `border-fg/10`
- **Text**: tone classes use `text-foreground`, `text-primary`, `text-danger`, `text-success` (matches legacy naming); added `data-sireno-ui-text="true"`
- **Icon**: added `data-sireno-ui-icon="true"` to all render paths
- **Label**: re-implemented using `<Text>` component (like legacy pattern); wrapper with `data-sireno-ui-label="true"`
- **Chip**: simplified to `bg-bg/80 text-fg ring-frame/30`; added `data-sireno-ui-chip="true"`
- **TapIndicator**: re-implemented as TAP/TAPx2/HOLD label with `sireno-tap` class, using `<Text>` inside; `data-sireno-ui-tap-indicator="true"`
- **IconLabel**: added `data-sireno-ui-icon-label="true"`
- **Bars**: uses `h-1.5 rounded bg-bar` track + `bg-bar-accent` fill; labels use `<Text>`; `data-sireno-ui-bars="true"`
- **LabelValueList**: uses `<Text size="xs">` for both label and value; `data-sireno-ui-label-value-list="true"`
- **SplitAction**: uses `border-frame` divider

## Key files
- `ButtonFrame.tsx` — border-frame token
- `components/Text.tsx` — legacy tone classes + data attr
- `components/Icon.tsx` — data attr
- `components/Label.tsx` — Text-based impl
- `components/Chip.tsx` — bg-bg/80 style
- `components/TapIndicator.tsx` — TAP label style
- `surfaces/IconLabel.tsx`, `Bars.tsx`, `LabelValueList.tsx`, `SplitAction.tsx` — data attrs + token alignment

## Notes for downstream
- Plan 03 can reference `data-sireno-ui-*` attributes in addon frontends
