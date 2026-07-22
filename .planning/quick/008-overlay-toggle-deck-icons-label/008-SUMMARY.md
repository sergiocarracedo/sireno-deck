# Quick Task 008 Summary

**Task:** Standalone overlay-root n-1 toggle must show the matched overlay
deck icon, a slash, and the layers icon above the label `Toggle overlay`.
**Completed:** 2026-07-22
**Code commit:** `f1dab3f2`

## What was built

`core:overlay-toggle` is rendered through `ButtonSurface` in `Deck.tsx`,
which (until this task) called `renderSystemButton(button.type)` without
forwarding the matched overlay deck icon. The icon was reaching the
`Deck` cell (`deckOverlayIcon`) but only the split-mode branch used it.
A new composite surface — three icons (`deckIcon` `slash` `layers`) over
the label `Toggle overlay` — is rendered when both `button.type ===
"core:overlay-toggle"` and `deckOverlayIcon` is a non-empty string.
Split-mode (back/settings + overlay split), the default registry
surface (`Overlay` + `icon://layers`), and every other system button are
unchanged.

## Key files

- `packages/cli/src/deck/system-buttons/registry.tsx` — added
  `OverlayToggleSurface` (private) and exported
  `renderOverlayToggleButton(deckIcon)`. Composes the existing `Icon`
  (dynamic source) and `Label` primitives; no new dependencies.
- `packages/cli/frontend/src/components/Deck.tsx` —
  `ButtonSurfaceProps` now carries an optional `deckOverlayIcon`. The
  standalone branch in `ButtonSurface` narrows on
  `core:overlay-toggle` and routes to
  `renderOverlayToggleButton(deckOverlayIcon)` when a deck icon is
  present; otherwise falls through to the previous
  `renderSystemButton(button.type)`.
- `packages/cli/frontend/src/__tests__/system-buttons-render.test.tsx`
  — new test asserting the composite surface renders 3 icons
  (`data-sireno-ui-icon="true"`, first is `data-sireno-icon-source="generic"`),
  label `Toggle overlay`, no split-action marker, and the default
  `Overlay` label is absent.

## Decisions made

- Used `Icon` for all three glyphs (deck icon is dynamic; could be a
  Lucide name, asset, or emoji). Reusing `Icon` keeps support for
  `asset://` add-on icons without a second codepath.
- The default registry label for `core:overlay-toggle` stays `Overlay`.
  The `Toggle overlay` label only applies in the standalone-with-deck-icon
  case, which the surface encapsulates. Split-mode and the registry
  default remain identical, so `SYSTEM_TYPES` registry tests and the
  split-surface tests need no changes.
- `renderOverlayToggleButton(deckIcon: string)` is exported (rather than
  inlining the surface in `Deck.tsx`) so the composite shape lives next
  to the other system-button renderers — easy to find and consistent
  with `renderSystemButton`.

## Deviations

- None.

## Verification

- `pnpm exec vitest run packages/cli/frontend/src/__tests__/system-buttons-render.test.tsx`
  → 9 tests passed (5 registry + 5 Deck, including the new composite
  test).
- `pnpm exec vitest run packages/cli/frontend` → 35 tests passed; the
  empty `ws-integration.test.tsx` is a pre-existing baseline placeholder.
- `pnpm -C packages/cli typecheck` → no new errors; pre-existing errors
  in `Text.test.tsx`, `config-diff.test.ts`, `config-diff.ts`,
  `addon-registry.ts`, `icon-asset-registry.ts`, `src/index.ts`,
  `frontend/src/components/Deck.tsx` are baseline and unrelated.
- `pnpm -C packages/cli lint` → only pre-existing baseline errors
  (notably the `src/index.ts → frontend/src/components/Deck` restricted
  import introduced by phase 09-03, commit `9af8b1c5`).

## Notes for downstream

- The composite surface is gated on having a non-empty `deckOverlayIcon`
  string. If the matched overlay addon forgets to set `icon`, the cell
  falls back to the default `Overlay` + `icon://layers` — by design,
  because there is nothing to show in the first slot.
- Quick-005 introduced the standalone `core:overlay-toggle` cell; this
  task finishes the visual presentation of that cell. Split-mode
  (regular-deck n-1 with overlay available) was already correctly
  showing the matched deck icon via the existing split-surface code
  path and remains unchanged.

## Files changed

- `packages/cli/src/deck/system-buttons/registry.tsx`
- `packages/cli/frontend/src/components/Deck.tsx`
- `packages/cli/frontend/src/__tests__/system-buttons-render.test.tsx`

## Commits

- `f1dab3f2` feat(quick-008): overlay toggle shows deck icon, slash, layers; label 'Toggle overlay'
