# Quick Task 008 — Plan

**Slug:** overlay-toggle-deck-icons-label
**Status:** Ready for execution

## Objective

When the n-1 button on a deck is a `core:overlay-toggle` (the standalone
overlay-root case introduced by quick-005) AND the deck receives an
`overlayDeckIcon` from the bridge, render a composite surface that shows
the matched overlay deck icon, a slash, and the layers icon, with the
label `Toggle overlay`. Preserve the existing single-icon behaviour
(plain `Overlay` label, layers icon) when no deck icon is provided, and
leave split-mode (n-1 + `core:back` / `core:settings-entry`) and all other
system buttons untouched.

## Bug summary

1. Quick-005 made `core:overlay-toggle` the n-1 button on the root of an
   overlay deck. The toggle is rendered via `ButtonSurface`
   (`packages/cli/frontend/src/components/Deck.tsx:224-226`), which calls
   `renderSystemButton(button.type)` with no icon override. The
   frontend already has the matched deck icon
   (`Deck.overlayDeckIcon` → `DeckButtonCellProps.overlayDeckIcon` →
   `deckOverlayIcon`), but it is only forwarded into the
   `SplitActionSurface` (line 165) and never reaches the standalone
   `core:overlay-toggle` cell.
2. The default surface (`IconLabelSurface`) shows a single icon
   (`icon://layers`) and the label `Overlay`. There is no visual cue
   that this button toggles the matched overlay deck — neither the deck
   icon nor an explicit "toggle" verb.

## Task 1 — Composite overlay-toggle surface

<files>
- `packages/cli/src/deck/system-buttons/registry.tsx`
</files>

<action>
- Add a private component `OverlayToggleSurface` to
  `packages/cli/src/deck/system-buttons/registry.tsx`.
- It accepts `deckIcon: string` (the value of `overlayDeckIcon`,
  e.g. `icon://chrome`, `asset://...`, or a single emoji).
- Layout: same `flex flex-col items-center justify-center gap-1` wrapper
  used by `IconLabelSurface`.
- Above the label, render one row of three icons in this order:
  1. `<Icon source={deckIcon} size={26} />` — the matched overlay deck
     icon (uses the existing `Icon` primitive; supports all icon
     sources including emoji via `Icon`).
  2. `<Icon source="icon://slash" size={14} />` — a separator
     (Lucide `Slash` icon, already exposed via `icon://slash`).
  3. `<Icon source="icon://layers" size={26} />` — the layers glyph
     (Lucide `Layers`, already exposed via `icon://layers`).
- Gap between the three icons: `gap-1`. Group them in a single flex row
  (`flex items-center gap-1`).
- Below the row, render `<Label text="Toggle overlay" lines={2} />`
  using the existing `Label` primitive.
- Add a new exported helper `renderOverlayToggleButton(deckIcon: string)`
  in the same file. It returns the `OverlayToggleSurface`.
- Do NOT change `renderSystemButton` or the `SYSTEM_BUTTON_LAYOUT`
  default for `core:overlay-toggle`. Split-mode and registry defaults
  remain identical.
- Do NOT generalise `IconLabelSurface` — that surface remains
  single-icon. The composite shape is specific to this surface.
</action>

<verify>
- `pnpm -C packages/cli typecheck` — no new errors.
- `pnpm -C packages/cli lint` — no new errors.
</verify>

<done>
- `grep -n "OverlayToggleSurface" packages/cli/src/deck/system-buttons/registry.tsx`
  shows the new component and exporter.
- `grep -n "Toggle overlay" packages/cli/src/deck/system-buttons/registry.tsx`
  shows the literal label used by the surface.
- `grep -n 'icon://slash' packages/cli/src/deck/system-buttons/registry.tsx`
  shows the separator icon reference.
</done>

## Task 2 — Wire deck icon into standalone overlay-toggle cell

<files>
- `packages/cli/frontend/src/components/Deck.tsx`
</files>

<action>
- In `DeckButtonCell`, the standalone branch (lines ~189-205) already
  receives `overlayDeckIcon: deckOverlayIcon`. The non-split,
  non-error, non-full path calls `<ButtonSurface button={button} />`
  without forwarding the icon.
- Extend `ButtonSurfaceProps` with an optional `deckOverlayIcon?: string |
  null`. In `DeckButtonCell`, pass it through:
  `<ButtonSurface button={button} deckOverlayIcon={deckOverlayIcon} />`.
- In `ButtonSurface`, after the existing `if (isSystemButton(button.type))`
  branch, narrow on `button.type === "core:overlay-toggle"`:
  - If `deckOverlayIcon` is a non-empty string, return
    `renderOverlayToggleButton(deckOverlayIcon)` (imported from
    `@/deck/system-buttons/registry`).
  - Otherwise fall through to the existing `renderSystemButton(button.type)`
    (preserves the current standalone default — no `Overlay` regression
    when no deck icon is configured).
- Import `renderOverlayToggleButton` alongside the existing
  `isSystemButton` / `renderSystemButton` import.
</action>

<verify>
- `pnpm -C packages/cli typecheck` — no new errors.
- `pnpm -C packages/cli lint` — no new errors.
- Manual: in the running CLI, open chrome-overlay → chrome-overlay root
  shows the matched deck icon, slash, layers, label "Toggle overlay".
  In any deck without an overlay deck icon configured, the standalone
  toggle cell still shows layers icon + "Overlay" label.
</verify>

<done>
- `grep -n "renderOverlayToggleButton" packages/cli/frontend/src/components/Deck.tsx`
  shows the new branch.
- Split-mode tests still pass (no behaviour change for back/settings +
  overlay split).
</done>

## Task 3 — Test: standalone overlay-toggle cell shows the composite surface

<files>
- `packages/cli/frontend/src/__tests__/system-buttons-render.test.tsx`
</files>

<action>
- Add one new test inside `describe("Deck with system buttons", …)`,
  titled `"renders the composite overlay-toggle surface at n-1 on an
  overlay root with a deck icon"`.
- Build a deck object with:
  - `id: "overlay-root"`, `name: "Overlay Root"`,
  - `hasOverlayDeckAvailable: false` (so split mode does NOT activate
    on the standalone toggle cell — that branch is for main-deck
    back/settings),
  - `overlayDeckIcon: "icon://chrome"`,
  - `buttons: [{ id: "14", type: "core:overlay-toggle", config: {} }]`.
- Render with `getDeviceModel("mk2")` (15 keys; n-1 = 14).
- Assert:
  - `container.querySelector('[data-button-type="core:overlay-toggle"]')`
    is non-null.
  - `container.querySelector('[data-split-action="true"]')` is null
    (no split surface).
  - `screen.getByText("Toggle overlay")` is present.
  - The composite surface contains exactly three
    `[data-sireno-ui-icon="true"]` icons (deck + slash + layers).
  - The first icon's `data-sireno-icon-source` is `"generic"` (Lucide;
    `icon://chrome` resolves to the Chrome Lucide icon).
  - `screen.queryByText("Overlay")` is null (the default label is
    replaced when a deck icon is present).
- The existing registry test that asserts `core:overlay-toggle` renders
  with label `Overlay` via `renderSystemButton(type)` must continue to
  pass — the composite surface is gated on having a deck icon, and the
  default helper is unchanged.
</action>

<verify>
- `pnpm -C packages/cli test src/frontend/__tests__/system-buttons-render.test.tsx`
  — all tests pass (5 existing registry + 5 existing Deck + 1 new).
- `pnpm -C packages/cli typecheck` — no new errors.
- `pnpm -C packages/cli lint` — no new errors.
</verify>

<done>
- The new test fails without Task 1 + Task 2 changes and passes with
  them.
- Pre-existing test failures documented in STATE.md remain at the same
  baseline (no new failures introduced).
</done>

## Commit cadence

After Task 3 completes and the full focused command set is green:

```
git add packages/cli/src/deck/system-buttons/registry.tsx \
        packages/cli/frontend/src/components/Deck.tsx \
        packages/cli/frontend/src/__tests__/system-buttons-render.test.tsx
git commit -m "feat(quick-008): overlay toggle shows deck icon, slash, layers; label 'Toggle overlay'"
```

## Out of scope

- Generalising `IconLabelSurface` to accept multiple icons. The composite
  layout is specific to this surface; speculative generalization adds
  API surface without a second caller.
- Asset-based composite icons (`asset://overlay-toggle-composite`). The
  icons are dynamic (the deck icon varies per addon), so an asset
  cannot encode the deck icon. SVG-in-Icon source would also be
  speculative (no second SVG source today).
- Animating the slash or the layers glyph. Static is enough for the
  requested visual.
- Changing the default registry label for `core:overlay-toggle` from
  `Overlay` to `Toggle overlay`. That label is only correct in the
  standalone-with-deck-icon case; keeping it `Overlay` preserves the
  current split-mode and registry-default behaviour.
- Pre-existing test failures (weather frontend, emoji selector, run.test
  mock, integration, addon, addon-core-lock, config.bootstrap,
  emoji-decks, ws-integration). Documented in STATE.md; out of scope.
