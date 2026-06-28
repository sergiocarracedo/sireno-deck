# Plan 15-01 Summary

**Completed:** 2026-06-28

## What was built
Ported 5 base primitive components (Text, Icon, Label, Chip, TapIndicator) plus the theme override context system from legacy sireno-deck into `packages/cli/src/ui/`. Also added `cn` utility, `computeNegativeColor` utility, and `resolveDomAssetSrc` in the addon API. Components support full legacy behavior including rich text markup (highlight, blink, dim, tone/size tags, line-breaks) and theme override dispatch via React context.

## Key files
- `packages/cli/src/ui/Text.tsx` — Rich text parser + rendering (293 lines)
- `packages/cli/src/ui/Icon.tsx` — Lucide + brand + asset icon resolution (148 lines)
- `packages/cli/src/ui/Label.tsx` — Uppercase primary label via Text (29 lines)
- `packages/cli/src/ui/Chip.tsx` — Rounded border chip with tone variants (41 lines)
- `packages/cli/src/ui/TapIndicator.tsx` — TAP/TAPx2/HOLD indicator badges (63 lines)
- `packages/cli/src/ui/theme-presentation.tsx` — React context + provider + hook for theme overrides
- `packages/cli/src/ui/utils/cn.ts` — Minimal conditional class name utility
- `packages/cli/src/ui/utils/negative-color.ts` — Contrast color math
- `packages/cli/src/ui/index.ts` — Barrel re-exporting all primitives + context
- `packages/cli/src/addon/api.ts` — Added `resolveDomAssetSrc`, `setDomAssetPathResolver`

## Decisions made
- `ThemeUiPresentation` type defined locally in theme-presentation.tsx (not imported from `@/config/theme/schemas` which doesn't exist yet)
- `cn()` accepts both variadic args and single-array arg for maximum compatibility
- `dim` tag merged into `RichMarkupTag` union and `RICH_TAG_NAMES` set, renders as `opacity-50`
- Barrel exports `DomThemeUiPresentationProvider as ThemeUiPresentationProvider` for plan compatibility

## Notes for downstream
- Themes (default, light) still have their own `components/` and `surfaces/` directories — Plan 15-02 will rewrite theme indexes to re-export from `@/ui/` and delete local copies
- `@/config/theme/schemas.ts` does not exist yet — will be created in future phase
- Frontend test files (2) still fail due to `virtual:sireno/addons/registry` not present in vitest — pre-existing
