# Phase 13: UI Alignment with Legacy - Context

**Gathered:** 2026-06-27
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the default theme's color palette, fonts, and component styling with the exact legacy values from `/works/opensource/sireno-deck/packages/cli/frontend/public/__sireno/theme.css`. Re-implement all 5 theme components (Icon, Label, Chip, TapIndicator, Text) and 4 surfaces (IconLabel, Bars, LabelValueList, SplitAction) using the legacy visual structure — expressed in our Tailwind v4 utility classes. Migrate the 7 addon `frontend.tsx` files to use the legacy surfaces and theme components so the emulator/frontend is visually indistinguishable from the legacy `sireno-deck` v1.

</domain>

<decisions>
## Implementation Decisions

### R-tokens — Color palette (value replacement)

- **Replace all current --color-* values with the exact legacy values** from `/works/opensource/sireno-deck/packages/cli/frontend/public/__sireno/theme.css`:

  | Token            | Current (ours) | Legacy value  |
  |-----------------|----------------|---------------|
  | --color-bg      | #0a0a0a        | #2e3540       |
  | --color-fg      | #fafafa        | #eef2f7       |
  | --color-accent  | #38bdf8        | #7dd3fc (primary) |
  | --color-muted   | #737373        | (keep or adjust)  |
  | --color-bar     | #262626        | (keep or adjust)  |
  | --color-ring    | #fafafa        | #eef2f7       |
  | --color-tap     | #38bdf8        | #7dd3fc       |

- **Add new tokens** matching the legacy: `--color-frame: #53738B`, `--color-foreground-contrast: #000000`, `--color-success: #34d399`, `--color-danger: #FFB4AB`, `--color-primary: #7dd3fc`.
- **Replace font families** with legacy values: `--font-mono: "IBM Plex Mono", ui-monospace, monospace`, `--font-main: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif`, `--font-aux: "IBM Plex Sans", ui-sans-serif, sans-serif`.
- The `--color-background` and `--color-frame` tokens are NOT needed as separate aliases since `--color-bg` now holds the exact legacy background value and `--color-frame` is added as a new token.

### R-comp — Component port strategy

- **Read legacy, re-implement with Tailwind v4.** Each legacy component at `/works/opensource/sireno-deck/packages/cli/src/ui/{Component}.tsx` is read for structure/tokens, then rewritten using our Tailwind v4 utility classes and theme tokens. No imports from legacy utilities (no `cn`, `clsx`, `tailwind-merge`, `theme-presentation`).
- **5 theme components to update:**
  - `Icon.tsx` (legacy 3.6K → re-implement icon rendering with Tailwind)
  - `Label.tsx` (legacy 610B → re-implement with <Text>)
  - `Chip.tsx` (legacy 1.0K → re-implement chip/badge)
  - `TapIndicator.tsx` (legacy 1.3K → re-implement tap animation)
  - `Text.tsx` — already ported in quick-008; just update CSS values to match legacy font sizes/weights.
- **4 surfaces to update:**
  - `IconLabel.tsx` (legacy 953B)
  - `Bars.tsx` (legacy 3.5K)
  - `LabelValueList.tsx` (legacy 4.0K)
  - `SplitAction.tsx` (legacy 1.5K)
- **7 addon frontends updated** to use the legacy surfaces + `Text` component.

### R-surface — Surface alignment + addon frontend migration

- Each addon frontend ships a React component. Those components should render using the theme's surfaces (`<IconLabel>`, `<Bars>`, `<LabelValueList>`, `<SplitAction>`) and components (`<Text>`, `<Icon>`, `<Chip>`, `<TapIndicator>`) — NOT hand-rolled `<span>` elements.
- The surfaces are already exported by the theme as `surfaces`. The addon frontends import them from the theme.
- The `ButtonFrame` already uses `bg-bg border-2 border-solid border-fg/10 rounded-2xl data-sireno-button-frame` (from quick-008). Update `border-fg/10` to `border-frame` once `--color-frame` is defined.

### Agent's Discretion

- Whether `--color-muted` and `--color-bar` stay as current values or are tuned to match legacy approximate colors. The legacy didn't have these exact tokens.
- The exact Tailwind v4 size tokens for font sizes (legacy used px values; convert to Tailwind size tokens where possible).
- Whether `TapIndicator` is still needed (the theme has `sireno-tap` animation CSS class; the component may be redundant).

</decisions>

<specifics>
## Specific Ideas

- The legacy colors come from `/works/opensource/sireno-deck/packages/cli/frontend/public/__sireno/theme.css`. Read this file and apply each value.
- The legacy component structure is at `/works/opensource/sireno-deck/packages/cli/src/ui/{Component}.tsx`. Read each before implementing.
- The legacy surfaces are at `/works/opensource/sireno-deck/packages/cli/src/ui/surfaces/{Surface}.tsx`.
- The legacy index is at `/works/opensource/sireno-deck/packages/cli/src/ui/index.ts`.
- The legacy IBM Plex fonts may need to be loaded. Check if the legacy CSS has `@font-face` rules — it does (`theme.css` has font-face for IBM Plex Sans/Mono). We need similar `@font-face` rules or CDN links.

## No specific requirements — open to standard approaches

- Whether to embed the IBM Plex fonts via `@font-face` (as legacy did) or link to Google Fonts CDN. Agent's choice — use `@font-face` from the legacy's font files if available in the assets directory.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/packages/cli/frontend/public/__sireno/theme.css` — the EXACT legacy color palette, font families, font sizes
- `/works/opensource/sireno-deck/packages/cli/src/ui/Text.tsx` — legacy Text component (7.4K) — already ported, verify completeness
- `/works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx` — legacy Icon component (3.6K)
- `/works/opensource/sireno-deck/packages/cli/src/ui/Label.tsx` — legacy Label (610B)
- `/works/opensource/sireno-deck/packages/cli/src/ui/Chip.tsx` — legacy Chip (1.0K)
- `/works/opensource/sireno-deck/packages/cli/src/ui/TapIndicator.tsx` — legacy TapIndicator (1.3K)
- `/works/opensource/sireno-deck/packages/cli/src/ui/surfaces/` — 5 legacy surfaces (BarsSurface, IconLabelSurface, LabelValueListSurface, MainLabelSurface, SplitActionSurface)
- `/works/opensource/sireno-deck/packages/cli/src/themes/default/ButtonFrame.tsx` — legacy ButtonFrame (already matched)
- Our current: `packages/cli/src/themes/default/{components,surfaces}/` — the files to update
- Our addon frontends: `packages/cli/src/builtin-addons/*/frontend.tsx` — 7 files to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`Text.tsx`** (`packages/cli/src/themes/default/components/Text.tsx`) — already ported in quick-008. Has rich markup parser, 8 sizes, 6 tones, 3 typography options, blink, dim, alignment, fit modes. Just needs CSS values updated to legacy.
- **`addonRegistry`** (from `virtual:sireno/addons/registry`) — the 7 addon frontends are already registered and rendering. They just need their visual JSX updated.
- **`useAddonChannel`** — works. The addons subscribe to state channels and render live data.

### Established Patterns

- **Tailwind v4 `@theme`** for CSS custom properties. The theme CSS files are at `themes/default/theme.css` and `themes/light/theme.css`.
- **Components export** from theme's `index.tsx` as `export const components = { Icon, Label, Text, TapIndicator, Chip }`.
- **Surfaces export** from theme's `index.tsx` as `export const surfaces = { IconLabel, Bars, LabelValueList, SplitAction }`.
- **Addon frontends** import from the theme: `import { Text } from "@sireno-deck-2/cli"` or directly from theme components.

### Integration Points

- **`theme.css`** (`@theme` block) — update ALL color values + add new tokens + change font families.
- **Theme `index.tsx`** — re-exports components and surfaces. No changes needed if file names stay the same.
- **Addon frontend files** — each uses hardcoded Tailwind classes. Replace with `<Text>` / `<IconLabel>` / `<Bars>` / `<LabelValueList>` / `<SplitAction>`.

</code_context>

<deferred>
## Deferred Ideas

- **`<MainLabelSurface>`** — the legacy has 5 surfaces, we have 4. `MainLabelSurface` is not in our theme. Defer unless needed by a specific addon.
- **`cn` utility** — the legacy used `clsx` + `tailwind-merge`. Out of scope — we use plain Tailwind class strings.

</deferred>

---

*Phase: 13-ui-alignment*
*Context gathered: 2026-06-27*
