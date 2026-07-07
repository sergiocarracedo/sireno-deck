# Phase 15: Theme Base UI - Context

**Gathered:** 2026-06-28
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the legacy `packages/cli/src/ui/` components (Text, Icon, Label, Chip, TapIndicator) and surfaces (Bars, IconLabel, LabelValueList, SplitAction) into a shared `src/ui/` base layer at the project root. Every base component checks for a theme-provided override via React context (`useThemeUiPresentation()`), falling back to the base implementation when no override exists. Themes that extend the base (default, light, future) only ship the components/surfaces they actually change.

</domain>

<decisions>
## Implementation Decisions

### Architecture — `src/ui/` as the base

- The base lives at `packages/cli/src/ui/` — same path as legacy `sireno-deck`.
- It is NOT a theme. It's a shared component library that themes import from.
- Default and light themes remove their own `components/` and `surfaces/` directories. Their `index.tsx` exports the base components directly, optionally wrapping with theme-specific overrides via `ThemeUiPresentation`.
- Addon frontends import from `@/ui/` (e.g. `import { Text } from "@/ui/Text.tsx"`) instead of from a specific theme.

### Override mechanism — ThemeUiPresentation + React context

- Same pattern as legacy `sireno-deck/src/ui/theme-presentation.tsx`:
  - `ThemeUiPresentation` interface: `{ chip?, icon?, text?, label?, tapIndicator?, surfaces?: { iconLabel?, bars?, splitAction? } }` — each key is an optional render function that receives the same props as the base component.
  - Two React context providers: `ThemeUiPresentationProvider` (for the active theme) + `useThemeUiPresentation()` hook.
  - Every base component checks at render time: `if (themeUi?.text) return themeUi.text(props)` — if the theme supplies an override, use it; otherwise render the base implementation.
  - The provider wraps the Deck grid, populated from the active theme's `ui` export.

### Base source — re-port from legacy `src/ui/`

- Copy legacy files verbatim from `/works/opensource/sireno-deck/packages/cli/src/ui/`:
  - `Text.tsx` (rich markup parser, `highlight`, `blink`, tones, sizes, size tags, lineHeight prop, `!leading-[inherit]`)
  - `Icon.tsx` (Lucide resolution + brand icons + asset `src` images)
  - `Label.tsx` (Text wrapper with uppercase+tight+tracking+ellipsis)
  - `Chip.tsx` (pill with border + uppercase + tracking)
  - `TapIndicator.tsx` (TAP/TAPx2/HOLD labels with tone mappings)
  - Surfaces: `BarsSurface.tsx`, `IconLabelSurface.tsx`, `LabelValueListSurface.tsx`, `SplitActionSurface.tsx`
  - `theme-presentation.tsx` (context providers + hook)
- Adapt imports: replace `@/themes/utils/cn` with our own `cn` utility, resolve `@/addon/api` imports.
- Keep `data-sireno-ui-*` attributes as-is. They're already in our CSS.

### Theme manifest — `ui` export

- Each theme's `index.tsx` optionally exports a `ui: ThemeUiPresentation` object.
- Default theme exports `ui: undefined` (no overrides — base is the default look). Actually returns `ui: {}` or omits it entirely.
- Light theme exports `ui: undefined` if it doesn't override any components, or overrides specific ones.
- The theme system already has `manifest`, `components`, `surfaces`, `primitives`. Adding `ui` is a new export key.

### Agent's Discretion

- Whether to keep our Phase 13 `Text.tsx` improvements (like the `dim` tag) or discard them when re-porting from legacy. Preference: merge — keep our additions in the re-ported file.
- Whether to adapt legacy's `cn` utility or keep our current approach (plain Tailwind class strings). The legacy `cn` helps with conditional classes; we can provide a minimal one.
- Whether `MainLabelSurface` from legacy should be included. It was deferred in Phase 13. If it's needed for icon resolution in the re-ported IconLabel, include it; otherwise skip.

</decisions>

<specifics>
## Specific Ideas

- "Use the legacy code as the base, because it's the canonical reference for behavior." — User said this explicitly.
- "The override dispatch pattern from legacy (useThemeUiPresentation) is the right approach — it's proven and well-understood." — User said this explicitly.
- "The base lives at `src/ui/`, same path as legacy." — User said this explicitly.

## No specific requirements — open to standard approaches

- Whether to keep or remove the Phase 13 component files from `themes/default/components/` and `themes/default/surfaces/` after migration. They can be deleted since the base now serves as the source.
- Whether the base components should re-export types (TextProps, IconProps, etc.) from a barrel `src/ui/index.ts`.

</specifics>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/packages/cli/src/ui/Text.tsx` — full rich markup parser, tone/size/typography/layout system
- `/works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx` — Lucide resolution + brand + asset icons
- `/works/opensource/sireno-deck/packages/cli/src/ui/Label.tsx` — Text wrapper component
- `/works/opensource/sireno-deck/packages/cli/src/ui/Chip.tsx` — pill component
- `/works/opensource/sireno-deck/packages/cli/src/ui/TapIndicator.tsx` — gesture indicator
- `/works/opensource/sireno-deck/packages/cli/src/ui/theme-presentation.tsx` — React context providers + `useThemeUiPresentation()` hook
- `/works/opensource/sireno-deck/packages/cli/src/ui/surfaces/BarsSurface.tsx` — 1-3 bar items with fill height
- `/works/opensource/sireno-deck/packages/cli/src/ui/surfaces/IconLabelSurface.tsx` — icon + label centered
- `/works/opensource/sireno-deck/packages/cli/src/ui/surfaces/LabelValueListSurface.tsx` — 1-4 label/value rows
- `/works/opensource/sireno-deck/packages/cli/src/ui/surfaces/SplitActionSurface.tsx` — diagonal HR + TapIndicators + 0.65 scale
- `/works/opensource/sireno-deck/packages/cli/src/config/theme/schemas.ts` — `ThemeUiPresentation` interface definition
- Our current: `packages/cli/src/themes/default/index.tsx` — theme manifest shape to update
- Our current: `packages/cli/src/themes/light/index.tsx` — light theme manifest to update

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **Phase 13 components** (`themes/default/components/*`) — fully working, match legacy visuals. Can be used as reference/fallback during re-porting.
- **Phase 13 surfaces** (`themes/default/surfaces/*`) — same, working and visually matched.
- **`useAddonChannel` hook** — addon frontends already use this; no changes needed.
- **Vite virtual module system** — already handles `virtual:sireno/addons/registry`; no changes needed for base UI.

### Established Patterns

- **Tailwind v4 CSS tokens** — `@theme` block in `theme.css` defines `--color-*` and `--font-*`. Base components reference these tokens.
- **Addon frontend imports** — currently `import { Text } from "@sireno-deck/cli"`. After migration, this aliases to `@/ui/Text.tsx`.
- **Theme export shape** — `{ manifest, ButtonFrame, components, surfaces, primitives }`. Adding `ui` is additive.

### Integration Points

- **`src/ui/index.ts`** — new barrel that re-exports all base components/surfaces. Becomes the single import source for addon frontends and themes.
- **`themes/default/index.tsx`** — remove component/surface source files, import from `@/ui/`, export them (possibly with theme overrides).
- **`themes/light/index.tsx`** — same; currently re-exports from `../default/`, will import from `@/ui/` instead.
- **6 addon frontends** — update imports from `@sireno-deck/cli` to `@/ui/` (or the alias stays the same, mapped to `@/ui/`).
- **`ThemeUiPresentationProvider`** — must wrap the Deck grid in the frontend so `useThemeUiPresentation()` resolves correctly.

</code_context>

<deferred>
## Deferred Ideas

- **`MainLabelSurface`** — the legacy has 5 surfaces, we have 4. Deferred unless needed by a specific addon during re-porting.
- **`cn` utility** — the legacy used `clsx` + `tailwind-merge`. We can provide a minimal `cn` in `src/ui/utils/cn.ts` if needed for conditional classes.

</deferred>

---

_Phase: 15-theme-base-ui_
_Context gathered: 2026-06-28_
