---
phase: 13-ui-alignment
status: not-started
depends_on: [12-addon-frontend-registry]
---

# Phase 13 — UI Alignment with Legacy

**Goal:** port the legacy default theme's visual components (ButtonFrame, Text, Icon, Label, Chip, TapIndicator, surfaces) exactly — the emulator/frontend should be visually indistinguishable from the legacy `sireno-deck` v1.

## Why

Quick tasks 007-008 revealed that the default theme's ButtonFrame, Text component, and other visual primitives don't match the legacy. The legacy had specific styling:
- `ButtonFrame` as a `<div>` with `bg-background border-frame border-2 border-solid rounded-2xl data-sireno-button-frame`
- `<Text>` with rich markup parser, multiple tones/sizes/typography/alignment, blink animation
- Icon, Label, Chip, TapIndicator with legacy-specific CSS classes
- Surfaces (IconLabel, Bars, LabelValueList, SplitAction)

This phase is pure visual polish — no new capabilities.

## Scope

1. **ButtonFrame** — match legacy exactly (`<div>`, same CSS classes).
2. **Text** — already ported in quick-008; verify against legacy screenshot.
3. **Icon** — port from legacy `ui/Icon.tsx` (3.6K).
4. **Label** — port from legacy `ui/Label.tsx`.
5. **Chip** — port from legacy `ui/Chip.tsx`.
6. **TapIndicator** — port from legacy `ui/TapIndicator.tsx` (1.3K).
7. **Surfaces** — port `IconLabel`, `Bars`, `LabelValueList`, `SplitAction` from legacy `ui/surfaces/`.
8. **Theme CSS** — ensure `border-frame`, `bg-background`, and any missing tokens exist in `@theme`.

## Non-scope

- No new button types or addon behaviors.
- No protocol changes.
- No new concepts (the legacy components already map 1:1 to our theme's `components` and `surfaces` exports).
