# Phase 15: Theme Base UI — Research

**Date:** 2026-06-28
**Confidence:** HIGH

---

## Don't Hand-Roll

- **React Context override pattern** — use the proven `createContext` + custom hook approach from legacy (and from React docs / Kent C. Dodds patterns). Do NOT invent a new theme injection mechanism. The legacy `theme-presentation.tsx` already implements this correctly: context holds a `ThemeUiPresentation` object, `useThemeUiPresentation()` hook reads it, each component checks `if (themeUi?.text) return themeUi.text(props)` before falling back to base implementation. [VERIFIED: legacy codebase]
- **Rich text parser** — re-port the legacy `Text.tsx` parser verbatim. It handles highlight (`*text*`), tone tags (`<accent>`, `<danger>`, etc.), size tags (`<3xl>`, `<2xl>`, etc.), `blink`, and `|` line-breaks. This parser has been battle-tested and has edge-case handling (malformed tags fall back to literal output, nested tags work correctly). Do NOT write a new parser. [VERIFIED: legacy codebase + legacy tests]
- **Icon resolution** — re-port the legacy `Icon.tsx` which handles three sources (Lucide icons by name, brand icons like `github`, asset `src` images) with full type safety. The Lucide name resolution (`toLucideExportName`) is non-trivial. [VERIFIED: legacy codebase]

## Common Pitfalls

1. **Context value re-creation on every render** — if the `ThemeUiPresentation` object is created inline in the provider (`value={{ text: MyText }}`), it will cause all consumers to re-render on every parent render. The legacy avoids this because themes are statically imported modules whose `ui` export is defined once at module scope. Our implementation must do the same: the theme's `ui` object is a module-level constant, never recreated. [VERIFIED: Kent C. Dodds, "How to use React Context effectively" – recommends memoization]

2. **Missing `ThemeUiPresentationProvider`** — if the provider isn't mounted above the component tree, `useThemeUiPresentation()` returns `undefined`. The legacy handles this gracefully (components check `if (themeUi?.text)`), falling back to base implementation. Our base components must follow the same null-safe pattern. The provider should wrap the Deck grid in the emulator frontend and be injected in the Vite entry point.

3. **Circular imports** — `src/ui/index.ts` exporting all components, `themes/default/index.tsx` importing from `@/ui/`, and `src/ui/components/` importing utilities from the same package. Avoid: use `@/ui/` as the alias for the base, and ensure the barrel files do NOT cross-reference themes. [ASSUMED: standard monorepo barrel discipline]

4. **TypeScript path aliases must resolve** — `@/ui/` must map to `packages/cli/src/ui/` in `tsconfig.json` paths. If `tsx` or `vite` can't resolve the alias at runtime, components will fail to load. Our current tsconfig already has `@/` aliases; adding `@/ui/` as a sub-path requires no config change since `@/` already covers it. [VERIFIED: tsconfig.json inspection]

5. **Addon frontend imports break** — 6 addon frontends currently import from `@sireno-deck-2/cli`. These import paths must resolve to the new base components. The `@sireno-deck-2/cli` alias already maps to the package root in the Vite config; the `src/index.ts` barrel must re-export the base UI components. No import statement changes needed in addon frontends. [VERIFIED: vite config + src/index.ts inspection]

6. **Theme component/surface file deletion breaks existing imports** — when we delete `themes/default/components/Text.tsx` etc., any stale imports to those files (not through the barrel) will fail. Must search for all direct imports of these files before deletion. [ASSUMED: standard cleanup]

## Existing Patterns in This Codebase

- **`ThemeUiPresentation` interface** — already defined at `packages/cli/src/config/theme/schemas.ts`. Can reuse or update.
- **`useThemeUiPresentation()` hook** — needs to be created from scratch (no existing hook with this name). Must follow the Kent C. Dodds pattern: `useContext(ThemeUiPresentationContext)` inside a custom hook, throwing if used outside the provider.
- **`cn` utility** — legacy uses `clsx` + `tailwind-merge`. In Tailwind v4 with `@theme` tokens, class conflicts are less of an issue because custom CSS variables don't overlap. A minimal `cn` function (string array filter + join) is sufficient. No need to add `tailwind-merge` dependency.
- **`resolveDomAssetSrc`** — legacy Icon uses `import { resolveDomAssetSrc } from '@/addon/api'`. This resolves the asset path for `icon://` sources. Our codebase has a different asset path system; we need to check how assets are resolved in our v2 framework and adapt.
- **`computeNegativeColor`** — legacy BarsSurface uses `import { computeNegativeColor } from '../utils/negative-color'`. This computes a contrasting text color for value labels on colored bars. Must be included in the re-port.
- **`useThemeUiPresentation`** in surfaces — BarsSurface, IconLabelSurface, LabelValueListSurface, SplitActionSurface all check `if (themeUi?.surfaces?.bars)` before rendering. The base surfaces must implement this pattern.

## Recommended Approach

1. **Create `src/ui/` directory** with the following structure mirroring legacy:
   ```
   src/ui/
     index.ts                  # barrel re-exporting everything
     theme-presentation.tsx     # context + hook (re-port from legacy)
     Text.tsx                   # rich markup parser (re-port with our 'dim' addition)
     Icon.tsx                   # Lucide + brand + asset resolution (re-port)
     Label.tsx                  # Text wrapper (re-port)
     Chip.tsx                   # pill component (re-port)
     TapIndicator.tsx           # gesture indicators (re-port)
     utils/
       cn.ts                    # minimal conditional class utility
       negative-color.ts        # contrasting text color (re-port)
     surfaces/
       index.ts                 # barrel
       BarsSurface.tsx          # 1-3 bar items (re-port)
       IconLabelSurface.tsx     # icon + label (re-port)
       LabelValueListSurface.tsx # label/value rows (re-port)
       SplitActionSurface.tsx   # diagonal HR + indicators (re-port)
   ```

2. **Re-port from legacy** — copy legacy files verbatim, then:
   - Merge our Phase 13 `dim` tag addition into Text.tsx
   - Replace `@/themes/utils/cn` → our new `./utils/cn.ts`
   - Adapt `resolveDomAssetSrc` to our v2 asset system (or skip for icon:// sources if they work differently)
   - Keep `data-sireno-ui-*` attributes unchanged (CSS rules reference them)
   - Keep `useThemeUiPresentation()` checks in all components

3. **Update `src/index.ts`** — re-export all base components from the package barrel so `import { Text } from "@sireno-deck-2/cli"` resolves.

4. **Update themes** — both `default/index.tsx` and `light/index.tsx`:
   - Stop importing from `./components/*` and `./surfaces/*`
   - Import from `@/ui/` instead
   - Export `ui: {}` (empty, no overrides for now)
   - Keep `ButtonFrame` as-is (it's a theme primitive, not a base component)

5. **Mount `ThemeUiPresentationProvider`** — the Vite frontend entry point must wrap the app with the provider, populating it from the active theme's `ui` export. This replaces the current `useThemePresentation` or similar.

6. **Delete old theme component/surface directories** — remove `themes/default/components/`, `themes/default/surfaces/`, `themes/light/components/`, `themes/light/surfaces/` after verifying no stale imports remain.

7. **Re-verify all 6 addon frontends** — make sure they render correctly with base components. The bar component exports should resolve through the barrel import chain.

## Source Citations

- Legacy `theme-presentation.tsx` (44 lines): `/works/opensource/sireno-deck/packages/cli/src/ui/theme-presentation.tsx`
- Legacy Text.tsx (322 lines): `/works/opensource/sireno-deck/packages/cli/src/ui/Text.tsx`
- Legacy Icon.tsx (148 lines): `/works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx`
- Kent C. Dodds: "How to use React Context effectively" (2021) — validates the custom hook + private context pattern
- Our current theme manifests: `packages/cli/src/themes/default/index.tsx`, `packages/cli/src/themes/light/index.tsx`
- Our current package barrel: `packages/cli/src/index.ts`
