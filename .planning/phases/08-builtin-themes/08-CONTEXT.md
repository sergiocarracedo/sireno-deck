# Phase 08: Builtin Themes - Context

**Gathered:** 2026-06-24
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship two built-in themes (`default` and `light`) that:

- Live as addons in the addon manifest, sharing the same loader, registry, and contract as runtime addons
- Power visual styling for every button slot (default theme) and provide a light counterpart (light theme)
- Define shared design tokens via Tailwind 4 CSS variables, exposed as utility classes to addon code
- Animate tap / dbl-tap / hold gestures inside each button's visual frame
- Provide 4 reusable surface components (IconLabel, Bars, LabelValueList, SplitAction) and 5 UI primitives (Icon, Label, Text, TapIndicator, Chip) that addons compose to render content

The user picks the active theme through `RawConfigSchema.theme`; the CLI resolves the name against the addon registry at startup and ships the theme's `theme.css` + `index.tsx` to the frontend through the existing Vite plugin.

</domain>

<decisions>
## Implementation Decisions

### Theme contract

- A theme is an addon: `sirenoAddon.kind` is `'runtime' | 'theme'`. Default to `'runtime'` when absent for backward compatibility. Themes have no `main` (CLI-side), only `frontend` (which the Vite plugin imports); runtime addons have both. The same `sirenoAddon.apiVersion = 3` applies.
- Built-in themes (`default`, `light`) live in `packages/cli/src/themes/{name}/` and are auto-registered at CLI startup through `registerBuiltInThemes()` before user addons load.
- User themes live as separate packages installed alongside the CLI, discovered by the same addon loader. The addon registry keeps one `themesByName: Map` shared by both sources.

### Rendering architecture (three layers)

- The existing `packages/cli/frontend/src/components/ButtonFrame.tsx` stays as the **gesture wrapper** (pointer events, click / dblclick / contextmenu, gesture dispatch). Its sole new responsibility is to render the **active theme's outer ButtonFrame** with the addon content inside via `children`.
- The **theme's outer ButtonFrame** owns: layout (border, padding, radius), `role="button"`, `tabIndex=0`, tap-pulse class, hold-ring overlay. It receives the same `tap` / `dbl-tap` / `hold` flags plus `pressed` and the addon `children`.
- **Addon content** (the render fn from the addon contract) draws inside `children`. It composes the 4 surface components and 5 primitives the theme exports.

### Token strategy (Tailwind 4)

- Both themes share the same token names: `--color-bg`, `--color-fg`, `--color-accent`, `--color-ring`, `--color-tap`, `--color-muted`, `--color-bar`, `--color-bar-accent`, `--font-mono`. Themes never invent new token names; addon code that wants to look "themed" picks a name from this list.
- Each theme's `theme.css` declares its tokens with `@theme { --color-X: value; … }`. Tailwind 4 reads `@theme` at build time and creates the corresponding utility classes (`bg-bg`, `text-fg`, `ring-accent`, `border-bar`, etc.).
- The single `@theme` block in `packages/cli/frontend/src/index.css` is REPLACED by a `@import "virtual:sireno/theme";` directive. The Vite plugin serves the active theme's `theme.css` under the virtual module `virtual:sireno/theme`.
- The `default` theme ships two media-query-scoped `@theme` blocks: a `:root { ... }` block with the dark token set, and `@media (prefers-color-scheme: light) { :root { ... } }` with the light token set as the auto-switch override.
- The `light` theme ships the inverse: a `:root` block with light tokens, and `@media (prefers-color-scheme: dark) { :root { ... } }` with the dark override.

### Tap / dbl-tap / hold feedback

- `tap`: opacity 1 → 0.6 → 1 over 150 ms. The gesture wrapper toggles a class (`is-tapping`) on the theme ButtonFrame; the theme's `theme.css` defines the keyframes (`@keyframes tap-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.6 } }`).
- `dbl-tap`: same pulse, played twice. The wrapper applies `is-tapping` again on the second click; the CSS animation simply re-runs.
- `hold`: an SVG `<circle stroke-dasharray>` ring overlay drawn on top of the button, growing from 0% to 100% of its circumference over the hold lifetime (default 500 ms). The wrapper toggles `is-holding`; the theme's ButtonFrame renders the `<svg>` conditionally and CSS animates `stroke-dashoffset`.

### Surfaces (built into the theme)

- `IconLabel`: icon at top, label below, centered. Props: `{ icon: IconRef, label: string, size?: 'sm' | 'md' | 'lg' }`.
- `Bars`: up to 3 horizontal bars. Each row props: `{ value: number, min: number, max: number, accent?: boolean }`. Renders one rounded bar per row, value mapped to percent of `(value - min) / (max - min)`, `accent` swaps the fill token.
- `LabelValueList`: up to 4 rows, label left, value right, single-line ellipsis truncation per side. Props: `{ rows: Array<{ label: string, value: string }> }`.
- `SplitAction`: 50/50 horizontal halves, each half is a sub-render that emits its own tap / dbl-tap / hold. Consumes 2 button positions; the addon is responsible for returning 2 buttons from the renderer when it picks this surface.

### UI primitives

- `Icon`: thin wrapper around the CLI's `resolveIconRef`, picks `bg-icon` (or whatever the theme's token is) and the correct size.
- `Label`: small-caps label using the theme's `--font-mono` token.
- `Text`: generic text run; respects `text-fg` token, supports `tone: 'fg' | 'muted' | 'accent'`.
- `TapIndicator`: a small dot shown when the user is mid-gesture (helps accessibility on the device's tiny screen).
- `Chip`: pill-shaped label with a background token and text token.

### Configuration / wiring

- `RawConfigSchema.theme` (already declared at `packages/cli/src/config/schemas.ts:65`) stays as `z.string().min(1).optional()`. No change to the schema.
- At CLI startup, after `loadAddons()` runs, the CLI looks up `config.theme` (default: `'default'`) in `AddonRegistry.themesByName` and throws with a helpful error if the theme is missing.
- The CLI emits a `deck-config` WS message (already part of the v3 protocol) with the theme name on the wire; the frontend `ThemeProvider` receives it and stores the theme in a React context.
- The `sirenoDeck2()` Vite plugin takes the resolved theme's `cssPath` and `frontend` path and exposes them as `virtual:sireno/theme` and `virtual:sireno/themes/manifest`. The frontend's `index.css` does `@import "virtual:sireno/theme";`.

### Vite plugin extension

- The existing `packages/cli/src/vite/virtual-modules.ts` already serves `virtual:sireno/token` and `virtual:sireno/addons`. Add two more:
  - `virtual:sireno/theme` → resolves to the active theme's `theme.css` as a string.
  - `virtual:sireno/themes/manifest` → exports `{ name, components, surfaces, primitives }` so the frontend can iterate.
- The plugin's public API (`sirenoDeck2({ token, theme })`) gains a `theme` option. `vite.config.ts` in the frontend reads it from `process.env.SIRENO_THEME` (set by the CLI when it spawns Vite).

### Agent's Discretion

- Exact pixel values for tokens (dark vs light, what shade of grey, what accent hue); the *names* are locked.
- Hold lifetime and tap pulse duration (defaults: 500 ms and 150 ms).
- Whether `SplitAction` is selected via a "surface" prop on the button config or via a 2-element renderer (the latter; keeps the addon contract simple).
- The error message format when `config.theme` is set to a name that doesn't exist.

</decisions>

<specifics>
## Specific Ideas

- "Default theme should be the dark one; light theme is the user-facing flip." — User said this explicitly during discussion.
- "Built-in themes are *built-in* — they live in the CLI package, not in user space. The user is never expected to install `default` or `light` from npm." — User said this explicitly.
- "User themes (third-party ones) should still go through the addon loader. Only the *built-in* registration path is special." — User said this explicitly.
- "A theme is just an addon that the registry treats differently. Same `sirenoAddon.apiVersion`, same `frontend` import. The only thing the registry does is keep a separate `themesByName` map." — User's framing.
- "Tokens are CSS variables, not Tailwind config. Tailwind 4 reads `@theme` at build time and creates the utilities. We don't run a Vite plugin that scans source for token names." — User's framing.
- "The `@theme` block in `index.css` is going away. The theme's CSS owns the tokens." — User said this explicitly.
- "The default theme should follow `prefers-color-scheme` — dark by default, flips to light on macOS light mode." — User said this explicitly.
- "Tap = opacity pulse. Hold = stroke-dasharray ring." — User's tap-feedback model.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — R17 (two built-in themes, Tailwind 4 token strategy)
- `.planning/PROJECT.md` — project goals, audience
- `packages/cli/src/addon/manifest.ts` — current addon manifest schema (the `kind` discriminator will be added here)
- `packages/cli/src/addon/registry.ts` — current registry shape (will gain `themesByName`)
- `packages/cli/src/addon/loader.ts` — current loader dispatch (will dispatch on `kind`)
- `packages/cli/src/vite/virtual-modules.ts` — existing virtual module pattern
- `packages/cli/frontend/src/components/ButtonFrame.tsx` — gesture wrapper that will compose the theme's ButtonFrame
- `packages/cli/frontend/src/index.css` — current `@theme` location; will be replaced
- `packages/cli/src/config/schemas.ts` — line 65, the `RawConfigSchema.theme` field
- `packages/cli/src/config/icon-resolver.ts` — `resolveIconRef` that `Icon` wraps
- Tailwind 4 docs: <https://tailwindcss.com/docs/theme> (CSS-first config + `@theme`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `packages/cli/src/addon/registry.ts` `AddonRegistry` class: can be extended with `themesByName: Map<string, LoadedTheme>` and `loadTheme()`, `getTheme()`, `listThemes()` methods. No new dependencies needed.
- `packages/cli/src/vite/virtual-modules.ts`: the `virtual:sireno/token` resolver is the closest analogue to `virtual:sireno/theme` — both serve content as a virtual module string.
- `packages/cli/frontend/src/components/ButtonFrame.tsx`: the gesture wrapper already has the right pointer/click handlers; only the JSX needs a wrap around `children`.
- `packages/cli/src/config/icon-resolver.ts` `resolveIconRef`: the theme's `Icon` primitive wraps this, no need to re-implement icon resolution.

### Established Patterns

- **Addon as filesystem layout**: `sirenoAddon.{apiVersion, main, frontend}` parsed from package.json. Themes will keep this shape and just opt into `kind: 'theme'`.
- **Virtual modules via Vite**: pattern is `*_VIRTUAL_ID` + `*_RESOLVED_ID` (with `\0` prefix), `resolveId` returns resolved id, `load` returns module contents as a string. Reuse for `virtual:sireno/theme`.
- **Style via Tailwind utility classes**: existing code in `ButtonFrame.tsx` already uses Tailwind 4 utility classes. The new theme-owned tokens will be picked up by the same scanner.

### Integration Points

- The frontend's `index.css` becomes the seam: importing the virtual module pulls in the active theme's tokens.
- The CLI's `loadAddons()` step is the seam: dispatching by `kind` keeps runtime and theme loaders orthogonal.
- The `deck-config` WS message (already in the v3 protocol) is the seam: the frontend receives the theme name there and a `ThemeProvider` populates React context.

</code_context>

<deferred>
## Deferred Ideas

- **User-facing theme picker**: a CLI flag or config option to *preview* both themes side-by-side. — Future phase (user UI).
- **Per-button theming**: each button config could carry its own `surface: 'IconLabel' | 'Bars' | ...` hint. — Already covered by the addon contract; the addon chooses the surface from its renderer, no config knob needed.
- **Theme inheritance**: a "high-contrast" theme that extends `default` and only overrides `--color-fg` and `--color-bg`. — Future phase if a user asks for it. The `@theme inline` directive in Tailwind 4 supports this pattern when we get there.
- **Animated theme transitions**: cross-fade between themes on swap. — Defer to a UX pass; the simple swap is enough for the MVP.
- **More surfaces**: Charts, StatusGrid, Slider. — Future phases if a user addon needs them.

</deferred>

---

*Phase: 08-builtin-themes*
*Context gathered: 2026-06-24*
