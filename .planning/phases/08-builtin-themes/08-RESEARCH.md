# Phase 08: Builtin Themes — Research

**Date:** 2026-06-24
**Goal:** Validate the technology choices for Tailwind 4 theming, Vite virtual modules, and addon-as-theme architecture.

## Tailwind 4 CSS-first config

**Source:** <https://tailwindcss.com/docs/theme>

### Key findings

- `@theme { --color-X: value; }` defines a token AND auto-generates utility classes (`bg-X`, `text-X`, `ring-X`, `border-X`, `fill-X`, `stroke-X`).
- `@theme inline { --font-sans: var(--font-inter); }` declares a _reference_ to another variable; resolved at use site (not definition site). Useful for indirection.
- `@theme static { … }` declares tokens that should not be overridden by later `@theme` blocks.
- `:root { --color-X: value; }` outside `@theme` is a plain CSS variable — no utility classes created.
- Namespaces: `--color-*` (colors), `--font-*` (font-family), `--text-*` (font-size), `--font-weight-*` (font-weight), `--radius-*` (border-radius), `--shadow-*`, `--ease-*`, `--animate-*`, `--spacing`.

### Application to phase 08

- Each theme's `theme.css` uses `@theme { --color-…: …; }` to define the 8 tokens both themes share.
- The `@theme` block in `packages/cli/frontend/src/index.css` is **removed**; the file just does `@import "tailwindcss"; @import "virtual:sireno/theme"; :root { color-scheme: dark light; }`.
- The Vite plugin's `virtual:sireno/theme` resolver returns the active theme's `theme.css` as a string. Tailwind 4's scanner reads the file, picks up the `@theme` block, and generates the utility classes for `bg-bg`, `text-fg`, etc.

### Dark mode

- Tailwind 4 ships with a built-in `dark:` variant that defaults to `prefers-color-scheme: dark`.
- Can override with `@custom-variant dark (&:where(.dark, .dark *))` if the project uses a class-based dark mode. We do **not** override it; we use the built-in.
- For the `default` theme: a single `@theme` block scoped to `@media (prefers-color-scheme: light) :root` provides the light override; the base `:root` block is dark.
- For the `light` theme: inverse — base `:root` is light; `@media (prefers-color-scheme: dark) :root` is the dark override.

## Vite virtual modules (existing pattern)

**Source:** `packages/cli/src/vite/virtual-modules.ts`

### Existing modules

- `virtual:sireno/token` → resolves to a string module exporting the SIRENO_TOKEN.
- `virtual:sireno/addons` → resolves to a string module that imports all addon `frontend` files and re-exports them as a map.

### New modules for phase 08

- `virtual:sireno/theme` → resolves to the active theme's `theme.css` as a string. Loader returns the raw CSS so Tailwind 4's CSS pipeline can `@import` it and run the `@theme` scanner.
- `virtual:sireno/themes/manifest` → resolves to a JS module exporting `{ name, components, surfaces, primitives }` (the theme's exported surface components, primitives, and ButtonFrame).

### Implementation pattern

```ts
const THEME_VIRTUAL_ID = 'virtual:sireno/theme'
const THEME_RESOLVED_ID = '\0' + THEME_VIRTUAL_ID

resolveId(id) {
  if (id === THEME_VIRTUAL_ID) return THEME_RESOLVED_ID
}

load(id) {
  if (id === THEME_RESOLVED_ID) {
    return readFileSync(themeCssPath, 'utf8')
  }
}
```

The `sirenoDeck2({ token, theme })` plugin gains a `theme` option that takes `{ name, cssPath, frontend }`. The CLI passes the resolved theme info when it spawns Vite (via env var `SIRENO_THEME_CSS` / `SIRENO_THEME_FRONTEND` or a JSON blob).

## Addon manifest extension

**Source:** `packages/cli/src/addon/manifest.ts`

### Current schema

```ts
{
  apiVersion: 3,
  main?: string,    // CLI-side entry
  frontend?: string // browser-side entry
}
```

### Extension

```ts
{
  apiVersion: 3,
  kind?: 'runtime' | 'theme',  // defaults to 'runtime' if absent
  main?: string,
  frontend?: string
}
```

Validation: if `kind === 'theme'`, `frontend` is required (the theme has no CLI-side code). If `kind === 'runtime'`, both `main` and `frontend` are required (same as today).

## Addon registry extension

**Source:** `packages/cli/src/addon/registry.ts`

### Current shape

```ts
class AddonRegistry {
  addonsByName: Map<string, LoadedAddon>
  buttonsByType: Map<string, LoadedAddon>
  decksByType: Map<string, LoadedAddon>
  loadAddon(), getAddon(), listAddons(), getByType()
}
```

### Extension

```ts
class AddonRegistry {
  addonsByName: Map<string, LoadedAddon>
  buttonsByType: Map<string, LoadedAddon>
  decksByType: Map<string, LoadedAddon>
  themesByName: Map<string, LoadedTheme>  // NEW
  loadAddon(), getAddon(), listAddons(), getByType()
  loadTheme(), getTheme(), listThemes()  // NEW
}
```

The `loadAddons()` orchestrator dispatches on `manifest.kind`:

- `'runtime'` (or undefined) → existing `loadAddon()` path.
- `'theme'` → new `loadTheme()` path that reads only the `frontend` import and registers in `themesByName`.

## Gesture wrapper extension

**Source:** `packages/cli/frontend/src/components/ButtonFrame.tsx`

### Current behavior

- `useState(pressed)` for visual pressed state.
- `onPointerDown` / `onPointerUp` set `pressed` and start the hold timer.
- `onClick` / `onDoubleClick` / `onContextMenu` dispatch `tap` / `dbl-tap` / `hold` to the addon.

### Extension

- Wrap the existing gesture handlers around a new render tree:
  ```tsx
  <ThemeButtonFrame pressed={pressed} onTap={...} onDblTap={...} onHold={...}>
    {children}
  </ThemeButtonFrame>
  ```
- The active theme comes from a `useTheme()` hook that reads from `ThemeProvider`'s React context.
- The wrapper still owns the gesture dispatch (tap / dbl-tap / hold → addon lifecycle hooks); the theme's ButtonFrame owns visuals.

## Icon resolution

**Source:** `packages/cli/src/config/icon-resolver.ts`

The theme's `Icon` primitive wraps `resolveIconRef(ref, ctx)`. No new logic; the theme is a _consumer_ of icon resolution, not a producer.

## Project conventions (from .planning/AGENTS.md)

Already verified: TS 7.0.1-rc, React 19, Tailwind 4, Vite, vitest, oxlint, oxfmt. Code style: 2-space, single-quote, no-semi, trailing-comma all, 110 width.

Path aliases: tsc 7.0.1-rc forbids `baseUrl`; use relative paths or `@/` alias.

Tests: colocated in `__tests__/`; cover behavior not implementation.

Linting: `pnpm --filter sireno-deck-2 lint` (root lint OOMs).

## Open questions / risks

- **Tailwind 4 scanner and virtual modules**: does Tailwind 4's scanner read CSS imported through a Vite virtual module? Need to verify. If it doesn't, the theme's `@theme` block won't be picked up. _Mitigation_: if the scanner misses the virtual import, fall back to importing the theme's CSS directly from disk in `index.css` and rely on Vite's CSS handling. (This is the easier path; the virtual module is for _user_ themes, not built-in ones.)

- **Two `@theme` blocks for OS auto-switch**: the user's spec has the `default` theme owning both `:root` (dark) and `@media (prefers-color-scheme: light) :root` (light override). This is supported in Tailwind 4 — `@theme` blocks are valid inside media queries. Need to confirm with a tiny test in Plan 01.

- **SplitAction's 2-button consumption**: how does the addon contract signal that a button uses SplitAction and consumes 2 slots? Proposal: the renderer returns an array of N elements (today it returns one element). Backward compatible: existing renderers return a single element, new renderers can return `[el1, el2]`. The runtime appends the elements in order; if N > available slots, the extras are dropped. Defer to Plan 01's design step.

## Conclusion

The technology stack supports the design as specified. The two risks (virtual module scanner and SplitAction contract) have clear mitigations. Proceed with planning.
