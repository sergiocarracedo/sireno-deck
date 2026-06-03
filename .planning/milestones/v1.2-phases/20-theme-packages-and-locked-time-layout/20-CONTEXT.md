# Phase 20: Theme Packages, Asset Bundling, and Locked Time Layout - Context

**Gathered:** 2026-05-23
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Turn themes into manifest-backed packages with a required runtime entry, let themes own button-frame chrome while core keeps the slot/layout contract, add a manifest-declared asset model for fonts/CSS/images, fix the general external image/asset rendering path for user config and addons, and replace the implicit locked-session fallback with a centered five-button `HH:MM` layout. This phase clarifies packaging, asset, and locked-surface contracts; it does not add a broader CSS engine or new lock-mode capabilities beyond the already-scoped fallback behavior.

## Implementation Decisions

### Theme Package Contract
- A theme is a manifest-backed package with a required JavaScript entry, not a manifest-only data folder.
- Every theme must export the same runtime entrypoints; `buttonFrame` is mandatory rather than optional.
- Config may reference themes through a single overloaded package-or-path string, but loader diagnostics must stay path-aware and explain which resolution path failed.

### Theme-Owned Button Frame
- The theme-owned `buttonFrame` receives a narrow explicit visual state enum: `idle | tap | hold`.
- Themes own frame chrome and interaction styling, but core still owns the content slot contract, key sizing, and browser host layout assumptions.
- This phase should strengthen the existing plain React/DOM authoring model rather than introducing another render DSL.

### Theme Asset Model
- Themes declare assets through a manifest-backed asset registry.
- Fonts are declared as manifest assets and consumed through CSS `@font-face`, rather than through a separate font-specific DSL.
- CSS `url(...)` references must resolve relative to the CSS asset file location and be rewritten through the theme package loader.
- Broken asset references should fail with path-aware validation/runtime errors rather than silently degrading.

### External Image and Asset Rendering
- The phase fixes the general external asset pipeline for user config and addon-rendered images, not only the emoji selector.
- Emoji rendering may be used as one proof point, but the core contract should solve external asset resolution broadly enough for config-authored and addon-authored image references.

### Locked Fallback Layout
- The implicit locked-session fallback should use the center row buttons `5..9` as a fixed `[H][H][:][M][M]` layout.
- The colon occupies its own button in that five-button row.
- An explicitly configured `session.locked_deck` remains authoritative; the new five-button layout applies to the core-owned implicit fallback only.

### Agent's Discretion
- Exact manifest field names and runtime export names beyond the locked requirements above.
- Exact resolution order and file layout for builtin vs local vs npm theme packages, as long as diagnostics stay explicit.
- Whether the locked fallback digits are implemented as a dedicated builtin locked renderer, a generated deck, or another core-owned mechanism that preserves the fixed `5..9` contract.
- Whether the emoji selector proof uses a standard emoji asset library or another reliable packaged-asset strategy, as long as the broader external asset pipeline is the thing being fixed.

## Specific Ideas

- Themes now live in directories such as `themes/default/` with a mandatory `manifest.yml` and optional metadata like `description`, `version`, and `authors`.
- Non-host fonts should be bundled with the theme rather than assumed to exist on the user machine.
- CSS assets may reference images relative to the CSS file itself; the asset system must preserve that portability.
- The theme-owned `buttonFrame` should visibly react to `idle`, `tap`, and `hold` without taking over the full host layout contract.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/button-frame.tsx`
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`
- `packages/cli/src/core/schemas.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/config/theme.ts`: current theme loader/validator seam that will need to expand from single YAML files to manifest-backed theme packages.
- `packages/cli/src/render/dom-host.tsx`: current browser host seam that applies `ButtonFrame` by default and injects theme CSS/variables.
- `packages/cli/src/render/button-frame.tsx`: current core-owned frame implementation that will need to move behind the new theme contract.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`: existing packaged asset-heavy addon that is a useful proof surface for the broken external asset path.
- `packages/cli/src/core/schemas.ts`: current config theme reference and locked-deck validation seam.

### Established Patterns
- Path-aware config/theme diagnostics are already a core requirement and must survive the package-based theme resolver.
- Core still owns runtime/session behavior; theme customization should not silently redefine lock-mode control flow or host layout semantics.
- The repo already chose ordinary React/DOM authoring for browser-rendered surfaces, so theme customization should fit that model rather than wrapping it in a new declarative layer.

### Integration Points
- Theme resolution and validation in `packages/cli/src/config/theme.ts`
- Config schema/theme reference handling in `packages/cli/src/core/schemas.ts`
- Browser frame application in `packages/cli/src/render/dom-host.tsx`
- Default frame implementation in `packages/cli/src/render/button-frame.tsx`
- External asset-heavy proof path in `packages/cli/src/builtin-addons/emoji-selector/index.ts`
- Locked-session fallback generation in `packages/cli/src/deck/runtime.ts`

## Deferred Ideas

- Any broader CSS/layout engine beyond the manifest-backed asset registry and theme-owned frame seam.
- Theme-owned replacement of explicit custom `session.locked_deck` behavior.
- New lock-mode capabilities beyond the already-scoped implicit fallback layout update.

---
*Phase: 20-theme-packages-and-locked-time-layout*
*Context gathered: 2026-05-23*
