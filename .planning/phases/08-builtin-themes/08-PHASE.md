---
phase: 08-builtin-themes
status: not-started
depends_on: [04-ws-frontend]
---

# Phase 08 — Built-in Themes

Goal: two built-in themes (`default`, `light`) using Tailwind 4 + CSS variables + `@theme` directive.

## Outcomes

1. `src/themes/default/` — folder with `manifest.yml`, `theme.css`, `index.tsx`, `ButtonFrame.tsx`, surfaces, UI primitives.
2. `src/themes/light/` — same structure, light tokens.
3. `src/config/theme/schemas.ts` — `ThemeManifestSchema` (already partially in Phase 02).
4. `src/config/theme/loader.ts` — `resolveTheme(name, { baseDirectory })`.
5. Tailwind 4 setup: CSS variables in `:root`, `@theme { --color-bg: …; }` block.
6. `ButtonFrame` component renders title, icon, value, TapIndicator markers. Surface variants: `IconLabel`, `Bars`, `LabelValueList`, `SplitAction`.
7. UI primitives: `Chip`, `Icon`, `Label`, `Text`, `TapIndicator`.

## Requirements traceability

- **R17** (Tailwind 4 themes via CSS variables + `@theme` directive; two built-ins)

## Key files

```
src/themes/
  default/
    manifest.yml
    theme.css
    index.tsx
    ButtonFrame.tsx
    components/Icon.tsx
    components/Label.tsx
    components/Text.tsx
    components/TapIndicator.tsx
    surfaces/SplitAction.tsx
    surfaces/IconLabel.tsx
    surfaces/Bars.tsx
    surfaces/LabelValueList.tsx
  light/
    ... (same structure)

src/config/theme/
  schemas.ts
  loader.ts
  loader.test.ts
```
