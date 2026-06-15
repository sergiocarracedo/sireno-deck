# Plan 59-GC4 Summary

**Completed:** 2026-06-12

## What was built

Renamed `IconLabelSurface` to `MainLabelSurface` and widened its `main` prop to accept an emoji char in addition to the existing icon-source formats. The new component is the single canonical "main + label" surface used by 6 button consumers (core buttons and system buttons) plus the emoji-selector. Theme-facing type aliases are kept stable.

## Key files

- `packages/cli/src/ui/surfaces/IconLabelSurface.tsx` → **renamed to** `packages/cli/src/ui/surfaces/MainLabelSurface.tsx`. Component renamed, prop renamed, type widened. Added a private `isIconSource(value)` helper that returns `true` for SVG paths, `addon://`, `builtin://`, `icon://`, `brand://`, `./`, `/`, `http://`, `https://` prefixed values; returns `false` for plain text (emoji chars). When `main` is a string and not an icon source, render as `<span className="text-3xl leading-none">{main}</span>`; otherwise render via `<Icon>`.
- `packages/cli/src/ui/index.ts` — replaced `IconLabelSurface` export with `MainLabelSurface`.
- `packages/cli/src/config/theme/schemas.ts` — import updated; `ThemeIconLabelSurfaceProps` alias kept stable (now backed by `MainLabelSurfaceProps`).
- 6 button consumers updated via sed: `change-deck.tsx`, `action.tsx`, `SystemBackButton.tsx`, `SystemSettingsEntryButton.tsx`, `SystemSettingsButton.tsx`, `OverlayToggleButton.tsx`. Each had their `IconLabelSurface` import renamed, their `icon={...}` prop renamed to `main={...}`, and their inline `icon={{...}}` object literal renamed to `main={{...}}`.
- `packages/cli/src/ui/surfaces/__tests__/MainLabelSurface.test.tsx` — new 8-test suite covering: lucide source (`icon://plus`), brand source (`brand://github`), asset path (`./clock.svg`), addon:// path, single emoji char, multi-codepoint emoji (`✈\uFE0F`), IconProps object, no-main fallback. All 8 pass.

## Decisions made

- **`MainLabelSurface` over alternatives** (e.g., `PrimaryLabelSurface`, `LabelSurface`). The user explicitly asked for a rename and to suggest a name. `MainLabelSurface` mirrors the `main` prop name. Themes that override the surface use the `surfaces.iconLabel` hook which is unchanged.
- **Theme-facing alias `ThemeIconLabelSurfaceProps` kept stable.** Only the underlying import changes; theme authors who reference the type alias don't need to update. The runtime `iconLabel` hook in `ThemeUiPresentation` is also unchanged.
- **Local `isIconSource` helper in MainLabelSurface** (not exported to a shared util). It's used only by this component; not worth the cross-module surface. The emoji-selector's local copy from Plan 59-GC3 was removed in Plan 59-GC5.
- **`text-3xl leading-none` for emoji chars.** Matches the visual size of `<Icon size={30} />` (which is ~30px in the rendered SVG). `leading-none` prevents extra vertical padding.

## Notes for downstream

- Plan 59-GC5 builds on this to ensure all emoji buttons use the new component and have a label. The icon-vs-glyph detection logic now lives in one place (the new component) instead of being scattered.
- The 6 button consumers' prop name changed from `icon` to `main`. If any external theme author uses the surface in their own components, they would need to update their `icon={...}` to `main={...}`. This is a one-time migration.
- No regressions: 129 failed / 521 passed (650 total) after GC4; same 129 failures as the baseline (all pre-existing from uncommitted Phase 60/61 work), +8 new passes from the 8 MainLabelSurface tests.
