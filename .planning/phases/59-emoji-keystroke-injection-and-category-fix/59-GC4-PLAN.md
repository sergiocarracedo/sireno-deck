---
wave: 1
depends_on: [59-GC3]
gap_closure: true
files_modified:
  - packages/cli/src/ui/surfaces/IconLabelSurface.tsx (renamed to MainLabelSurface.tsx)
  - packages/cli/src/ui/index.ts
  - packages/cli/src/config/theme/schemas.ts
  - packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx
  - packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx
  - packages/cli/src/deck/system-buttons/SystemBackButton.tsx
  - packages/cli/src/deck/system-buttons/SystemSettingsEntryButton.tsx
  - packages/cli/src/deck/system-buttons/SystemSettingsButton.tsx
  - packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx
  - packages/cli/src/ui/surfaces/__tests__/MainLabelSurface.test.tsx (new)
autonomous: true
objective: Rename `IconLabelSurface` → `MainLabelSurface`; rename the `icon` prop → `main`; widen the `main` type to accept an emoji char in addition to the existing icon-source formats. Closes the follow-up gap from the user's GC3 review ("we can rename it to component name (do suggestion) and rename the icon prop to main").
created: 2026-06-12
---

# 59-GC4 — Rename `IconLabelSurface` to `MainLabelSurface`, accept emoji in `main` slot

> User's request (verbatim, post-59-GC3): "create a phase to refactor IconLabelSurface to accept 1 emoji emoji in the main (before called icon). We should rename the component"

## Context

The UAT for Phase 59 exposed that the category icons in the emoji-selector were duplicated because the data layer (5 of 11 categories pointing at the same SVG assets) had no distinct icons. Plan 59-GC3 worked around the data by allowing the emoji-selector's local `createButtonNode` helper to accept emoji chars OR icon sources. The user agreed the underlying fix is to widen the broader UI surface so the same approach can be used everywhere, with a clearer name.

The new component should:
- Have a more generic name (suggested: `MainLabelSurface`) — it accepts a `main` slot that can be an icon, brand, asset path, OR a glyph (single emoji char), paired with a required `label`.
- Be the single canonical "icon + label" surface used by all UI elements that currently use `IconLabelSurface`.

## Tasks

### Task 1: Rename the file and component

**Action:** Rename `packages/cli/src/ui/surfaces/IconLabelSurface.tsx` → `packages/cli/src/ui/surfaces/MainLabelSurface.tsx`. Rename the exported function `IconLabelSurface` → `MainLabelSurface`. Rename the exported `IconLabelSurfaceProps` interface → `MainLabelSurfaceProps`.

Use `git mv` (or a manual move + delete) so git history is preserved.

### Task 2: Widen the `main` prop and update the implementation

**File:** `packages/cli/src/ui/surfaces/MainLabelSurface.tsx`

Rename the `icon` prop to `main`. Widen the type:

```typescript
export interface MainLabelSurfaceProps {
  /**
   * The visual content above the label. Can be:
   * - An icon source string (`icon://plus`, `brand://github`, `./clock.svg`, `addon://...`)
   * - An emoji char (rendered as text in the default font stack)
   * - An `IconProps` object (passed through to `<Icon>`)
   */
  main?: IconProps | string
  label: string
}
```

Implementation:

```typescript
function isIconSource(value: string): boolean {
  return (
    value.includes('.svg') ||
    value.includes('.png') ||
    value.includes('.jpg') ||
    value.startsWith('addon://') ||
    value.startsWith('builtin://') ||
    value.startsWith('icon://') ||
    value.startsWith('brand://') ||
    value.startsWith('./') ||
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  )
}

export function MainLabelSurface(props: MainLabelSurfaceProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  const main = props.main
  const isString = typeof main === 'string'
  const iconProps = isString
    ? iconConfigToProps(main, { size: 30, tone: 'accent' })
    : { ...main, size: main?.size ?? 30, tone: main?.tone ?? 'accent' }

  if (themeUi?.surfaces?.iconLabel) {
    return themeUi.surfaces.iconLabel({ icon: iconProps, label: props.label })
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {isString && !isIconSource(main)
        ? <span className="text-3xl leading-none">{main}</span>
        : <Icon {...iconProps} />}
      <Label>{props.label}</Label>
    </div>
  )
}
```

Notes:
- The theme UI presentation hook still passes `iconProps` (not the raw emoji char) — themes that override the surface receive a normalized icon spec. If a theme wants to render an emoji char, it should be done at the theme level; the default fallback is the icon.
- The `<span>` for emoji chars uses `text-3xl` (matches the 30px icon size) and `leading-none` to avoid extra vertical space.

### Task 3: Update `ui/index.ts` re-exports

**File:** `packages/cli/src/ui/index.ts`

Replace `IconLabelSurface` and `IconLabelSurfaceProps` exports with `MainLabelSurface` and `MainLabelSurfaceProps`.

### Task 4: Update `config/theme/schemas.ts`

**File:** `packages/cli/src/config/theme/schemas.ts`

Update the import (line 3): `IconLabelSurfaceProps` → `MainLabelSurfaceProps`. Update the type alias (line 79): `ThemeIconLabelSurfaceProps` — keep the theme-facing name (it stays `ThemeIconLabelSurfaceProps` for theme author stability; the underlying import is just renamed). Update the type reference at line 88 to use the new import.

### Task 5: Update all button consumers

Update the 6 button files that currently use `IconLabelSurface`:

- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — change import; replace `<IconLabelSurface icon={...} label={...} />` with `<MainLabelSurface main={...} label={...} />`.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` — same.
- `packages/cli/src/deck/system-buttons/SystemBackButton.tsx` — same.
- `packages/cli/src/deck/system-buttons/SystemSettingsEntryButton.tsx` — same.
- `packages/cli/src/deck/system-buttons/SystemSettingsButton.tsx` — same.
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` — same.

### Task 6: Add a focused unit test

**File:** `packages/cli/src/ui/surfaces/__tests__/MainLabelSurface.test.tsx` (new)

Test the new behavior:
- Renders with an `icon://` source → renders an `<Icon>` for that source.
- Renders with a `brand://` source → renders the brand `<Icon>`.
- Renders with an asset path (`.svg`) → renders an `<img>` or `<Icon src=...>`.
- Renders with an emoji char (e.g. `😀`) → renders the char as text inside a `<span>`.
- Renders with no `main` → renders only the label.
- The `main` prop is required to be optional in the type; ensure the label still renders when `main` is omitted.

### Task 7: Build and verify

**Action:** Run build and the affected test suites. Search the codebase for any remaining `IconLabelSurface` references and clean up.

**Verify:** `pnpm --filter sireno-deck-cli build` exits 0. `pnpm --filter sireno-deck-cli test src/ui/surfaces` — all tests pass (including the new test). `pnpm --filter sireno-deck-cli test src/builtin-addons/core-buttons src/deck/system-buttons` — all tests pass (no regression from the prop rename in the button consumers).

**Done:** The component is renamed, the `main` prop accepts emoji chars, and all 6 button consumers use the new component.

## Must Haves

- [ ] File renamed: `IconLabelSurface.tsx` → `MainLabelSurface.tsx`
- [ ] Component renamed: `IconLabelSurface` → `MainLabelSurface`
- [ ] `icon` prop renamed to `main`; type widened to accept emoji chars
- [ ] `ui/index.ts` exports updated
- [ ] `config/theme/schemas.ts` import + type updated (theme-facing alias kept stable)
- [ ] All 6 button consumers updated to use the new component and prop name
- [ ] New unit test covers icon-source / brand / asset / emoji-char / no-main variants
- [ ] No regressions in any existing test suite
- [ ] Build is clean

## Notes for downstream

- The theme-facing alias `ThemeIconLabelSurfaceProps` is kept stable for theme authors — only the underlying import is renamed. Themes don't need to update their `iconLabel(...)` override.
- Plan 59-GC5 will follow up to ensure the emoji-selector entry buttons use the new component and have a label for every emoji (closing the visual-completeness gap the user raised).
