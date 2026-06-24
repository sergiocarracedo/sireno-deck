# Phase 08: Builtin Themes — Discussion Log

**Gathered:** 2026-06-24
**Mode:** standard

## Areas Discussed

### 1. Theme contract — addon vs first-class citizen

- **Considered**: Make themes a first-class concept (their own loader, their own folder structure).
- **Considered**: Reuse the addon contract verbatim with a `kind: 'theme'` discriminator.
- **Decision**: Reuse the addon contract. Themes have the same `sirenoAddon.apiVersion` and `frontend` field; only the `kind` and the absence of `main` distinguish them.
- **Rationale**: One loader, one registry, one set of validation rules. Themes are conceptually a kind of addon, and the user said "a theme is just an addon the registry treats differently".

### 2. Built-in theme location

- **Considered**: Ship `default` and `light` as separate npm packages installed alongside the CLI.
- **Considered**: Embed them in the CLI package at `packages/cli/src/themes/{default,light}/`.
- **Decision**: Embed. Auto-register at startup via `registerBuiltInThemes()`. User themes still go through the normal addon loader.
- **Rationale**: User explicitly said "built-in themes are built-in — they live in the CLI package, not in user space".

### 3. Rendering architecture — one wrapper or two

- **Considered**: Replace `ButtonFrame.tsx` entirely with a theme-owned gesture wrapper.
- **Considered**: Keep `ButtonFrame.tsx` as the gesture wrapper; have the theme own a separate *outer* ButtonFrame that handles visuals; the gesture wrapper renders the outer one.
- **Decision**: Two layers. The gesture wrapper stays (pointer events are the same regardless of theme); the theme's ButtonFrame owns visuals (border, padding, tap-pulse, hold-ring).
- **Rationale**: Pointer event handling is universal; visual styling is per-theme. Separating them keeps the gesture logic testable and theme-agnostic.

### 4. Token strategy — Tailwind config vs CSS variables

- **Considered**: Keep the existing `@theme` block in `index.css`; add per-theme overrides elsewhere.
- **Considered**: Move the `@theme` block to the theme's `theme.css`; `index.css` imports the virtual module.
- **Considered**: Tailwind config file (the old `tailwind.config.js` style) with theme registration.
- **Decision**: Per-theme `@theme` blocks in `theme.css`. The Vite plugin serves them via `virtual:sireno/theme`. `index.css` does `@import "virtual:sireno/theme";`.
- **Rationale**: Tailwind 4 reads `@theme` at build time. The theme owns its own tokens; the scanner picks them up. No JS config needed.

### 5. Token names — shared or per-theme

- **Considered**: Each theme picks its own token names (theme A calls it `--bg`, theme B calls it `--surface`).
- **Considered**: Shared token names across all themes; addons write `bg-bg` and the active theme provides the right value.
- **Decision**: Shared names. Both themes declare `--color-bg`, `--color-fg`, etc.
- **Rationale**: Addon code should be theme-agnostic. If tokens differ per theme, every addon has to handle the case where a token doesn't exist in the active theme.

### 6. Tap / dbl-tap / hold visual feedback

- **Considered**: JS-driven animations (requestAnimationFrame).
- **Considered**: CSS keyframes triggered by class toggles.
- **Decision**: CSS keyframes + class toggles. Tap = 150ms opacity pulse; dbl-tap = same pulse twice; hold = SVG ring overlay with `stroke-dasharray` animation.
- **Rationale**: CSS animations are GPU-accelerated and don't block React re-renders. The gesture wrapper just toggles classes.

### 7. Surfaces — how many in MVP

- **Considered**: 1 (just IconLabel) for the simplest possible theme.
- **Considered**: 4 (IconLabel, Bars, LabelValueList, SplitAction) covering most use cases.
- **Considered**: 5+ (adding Charts, StatusGrid).
- **Decision**: 4 surfaces. Charts and StatusGrid are more work and the user has not asked for them; defer to a future phase.
- **Rationale**: 4 covers the addons shipping today (timer/stopwatch → Bars, app launcher → IconLabel, smart home → LabelValueList, media → SplitAction for prev/play-next).

### 8. Theme switching

- **Considered**: Frontend polls the CLI every N seconds for the active theme.
- **Considered**: Frontend reads `localStorage` for the active theme.
- **Considered**: CLI sends the active theme name on the `deck-config` WS message.
- **Decision**: CLI sends it on `deck-config`. Frontend stores it in React context.
- **Rationale**: One source of truth (the CLI). Frontend doesn't need to poll or persist; the CLI is already in charge of config.

### 9. Vite plugin extension

- **Considered**: New plugin entirely (`sirenoDeck2Theme`).
- **Considered**: Extend the existing `sirenoDeck2()` plugin with a `theme` option.
- **Decision**: Extend the existing plugin. Two new virtual modules: `virtual:sireno/theme` (the active theme's CSS) and `virtual:sireno/themes/manifest` (the list of available themes for hot-reload or future UIs).
- **Rationale**: Keeps the Vite config simple; one plugin does everything.

### 10. OS auto-switch for default theme

- **Considered**: Default theme stays dark always.
- **Considered**: Default theme follows `prefers-color-scheme` (dark by default, flips to light on macOS light mode).
- **Decision**: Default theme follows `prefers-color-scheme`. Two `@theme` blocks: `:root` (dark) + `@media (prefers-color-scheme: light) :root` (light override).
- **Rationale**: User explicitly asked for this — "the auto-switch override on default".

## Decisions Delegated to Agent's Discretion

- Exact pixel values for tokens (dark vs light, what shade of grey, what accent hue).
- Hold lifetime (500 ms default) and tap pulse duration (150 ms default).
- The exact API for `SplitAction` (single-element with surface prop vs 2-element renderer; the latter chosen).
- The error message format when `config.theme` is set to a name that doesn't exist.

## Deferred Ideas

- User-facing theme picker.
- Per-button surface config (not needed; addon chooses).
- Theme inheritance with `@theme inline`.
- Animated cross-fade on theme swap.
- More surfaces (Charts, StatusGrid, Slider).

## Audit Trail

This file is for human audit only. Downstream agents should not reference it.
