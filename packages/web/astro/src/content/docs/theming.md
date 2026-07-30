---
title: Theming
description: Customize colors, fonts, and React components in Sireno Deck.
---

Sireno Deck's theme contract covers four layers, applied in order of precedence.

## 1. Color tokens

The default theme lives at `packages/cli/src/themes/default/sirenodeck.json`. The
`colorTokens` object maps semantic names to hex values:

```json
{
  "colorTokens": {
    "background": "#2e3540",
    "frame": "#53738b",
    "foreground": "#eef2f7",
    "primary": "#7dd3fc",
    "accent": "#c3f5ff",
    "success": "#34d399",
    "danger": "#ffb4ab"
  }
}
```

All UI components read these tokens — changing a value here propagates everywhere.

## 2. Typography roles

Three roles live under `typography` in the same file:

| Role             | Used for                |
| ---------------- | ----------------------- |
| `main_text`      | Button labels           |
| `auxiliary_text` | Hints, secondary labels |
| `monospace`      | Code snippets, values   |

Each role specifies `fontFamily`, `fontSize`, `fontWeight`, and optionally
`letterSpacing`.

## 3. Font files

Six font files (IBM Plex Sans + IBM Plex Mono, in three weights each) live in
`src/themes/default/assets/`. Replace any entry in the `fonts` array with your own
TTF/WOFF path to change the typeface.

## 4. CSS component hooks

The file `src/themes/default/components.css` exposes `.sireno-default-*` data
attribute selectors. Every button tile in a `ButtonFrame` receives the
`sireno-default-tile` class. Override the appearance of any component by
targeting the corresponding selector:

```css
.sireno-default-tile[data-state="active"] {
  filter: brightness(1.2);
}
```

## 5. React component substitution

`ThemeUiPresentationProvider` (exported from `packages/cli/src/ui`) accepts a
`presentation` prop with per-primitive and per-surface overrides:

```tsx
<ThemeUiPresentationProvider
  presentation={{
    surfaces: {
      iconLabel: ({ label, style }) => (
        <div style={{ ...style, background: "hotpink" }}>{label}</div>
      ),
    },
  }}
>
  <ButtonFrame tiles={tiles} />
</ThemeUiPresentationProvider>
```

## User themes

User-authored themes live outside the core distribution, at
`packages/themes/theme-XXXX/`. Run `sireno theme install ./theme-XXXX` to activate.
The theme API mirrors the default theme's directory layout.
