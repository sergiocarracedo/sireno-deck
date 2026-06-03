# Phase 28: Component-First TSX Theme UI Kit + CLI Watch Mode — Research

**Researched:** 2026-05-27
**Phase goal:** Let the UI/render path move to JSX/TSX component-first authoring with reusable theme-customizable utility components, tailwind-style class composition via `cn`, and a workspace-root `p cli:dev` watch flow that reruns the CLI through `tsx` on changes. [VERIFIED: .planning/ROADMAP.md]

**Confidence legend:** HIGH = official docs and local code agree, MEDIUM = official docs plus one inferred implementation consequence, LOW = useful hypothesis that still needs validation during planning.

## Don't Hand-Roll

| Problem | Recommended solution | Why |
|---------|----------------------|-----|
| Component-first UI contract | Use normal React TSX components with props/children for the public UI kit, not a second Sireno-specific helper DSL. **Confidence: HIGH** [CITED:https://react.dev/learn/your-first-component] [CITED:https://react.dev/learn/thinking-in-react] [CITED:https://react.dev/learn/passing-props-to-a-component] [VERIFIED: packages/cli/src/addon/api.ts] | React’s official guidance is to break UI into reusable components and pass data via props/children; Sireno already has the mounted `render(props)` seam, so a new abstraction would duplicate the contract instead of deepening it. [CITED:https://react.dev/learn/thinking-in-react] [VERIFIED: packages/cli/src/addon/api.ts] |
| Generic icon rendering | Back the core `Icon` component with `lucide-react` standalone icon imports. **Confidence: HIGH** [CITED:https://lucide.dev/guide/packages/lucide-react] | Lucide’s React package is designed for direct JSX use, is fully typed, and is tree-shakable when icons are imported individually. [CITED:https://lucide.dev/guide/packages/lucide-react] |
| Brand icon rendering | Back the same core `Icon` component with `simple-icons` package data rendered by Sireno, not remote CDN fetches at runtime. **Confidence: HIGH** [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md] | Simple Icons officially ships Node/TypeScript package exports and recommends ESM/tree-shaking; local package data keeps the renderer deterministic and offline-friendly. [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md] |
| Class composition | Reuse the existing `cn()` helper plus the curated Sireno utility stylesheet; extend that stylesheet only where the new UI kit truly needs it. **Confidence: HIGH** [VERIFIED: packages/cli/src/themes/utils/cn.ts] [VERIFIED: packages/cli/src/render/theme-utilities.ts] | The repo already has `clsx` + `tailwind-merge` composition and a theme-token utility layer, so adding a second styling system would directly violate prior phase decisions. [VERIFIED: packages/cli/src/themes/utils/cn.ts] [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md] |
| Dev watch loop | Use `tsx watch` on the real CLI startup seam and add explicit `--include` watches for config/theme/addon files. **Confidence: HIGH** [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md] [VERIFIED: package.json] [VERIFIED: packages/cli/package.json] | `tsx` officially supports watch mode plus extra include/exclude paths; the current repo scripts still point the package-level dev loop at `tsdown --watch`, which does not satisfy the phase goal of exercising `start --config config.yml`. [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: package.json] [VERIFIED: packages/cli/package.json] |

## Common Pitfalls

### Parallel helper + component APIs
**Confidence:** HIGH  
**What goes wrong:** Teams leave `createDomIcon`/`createDomTextLabel`/`createDomStack` in place while also adding `Icon`/`Text`/`Chip`, so built-ins, fixtures, docs, and external addons drift across two authoring models. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/index.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts]

**Why:** The current runtime already adapts mounted `render(props)` definitions back into the older `createInstance()` seam, so a “temporary” second presentation abstraction would stack one more compatibility layer on top of an existing one. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

**How to avoid:** Treat Phase 28 as a real contract cutover: public exports, built-ins, fixtures, and tests should converge on one component-first UI kit, while `render(props)` remains the only mounted render seam. [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md] [VERIFIED: .planning/STATE.md]

### `tsx watch` silently missing non-imported files
**Confidence:** HIGH  
**What goes wrong:** A `cli:dev` loop watches TypeScript imports but fails to restart when `config.yml`, theme YAML, addon manifests, or other local development files change. [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

**Why:** `tsx watch` automatically watches dependency graphs, but extra non-imported files require explicit `--include` entries. [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md]

**How to avoid:** Make the workspace-root script target the real seam and explicitly include repo config/theme/addon paths; use quoted globs and consider `--clear-screen=false` for readable restart logs. [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md] [VERIFIED: .planning/ROADMAP.md]

### Theme-level behavior drift in `Text`
**Confidence:** HIGH  
**What goes wrong:** Themes start overriding fit logic, overflow detection, or marquee behavior instead of only restyling the canonical text primitive. [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

**Why:** The phase context locks `Text` as the authoritative fit/marquee/ellipsis/wrap contract, and earlier v1.2 work already established that text fitting is a renderer-owned contract rather than per-surface guesswork. [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md] [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/STATE.md]

**How to avoid:** Keep `Text` behavior core-owned and let themes override presentation only (tokens, class names, wrappers, spacing), not overflow semantics. [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

### Dynamic icon lookup that defeats tree-shaking
**Confidence:** MEDIUM  
**What goes wrong:** A single `Icon` API is implemented by importing entire icon packages or doing wide runtime reflection over all exports, which is easy but likely bloats the bundle and muddies type safety. [CITED:https://lucide.dev/guide/packages/lucide-react] [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md] [ASSUMED]

**Why:** Lucide explicitly documents standalone imports as tree-shakable, and Simple Icons explicitly recommends ESM plus a tree-shaking bundler. That is a strong signal against broad package-wide import patterns. [CITED:https://lucide.dev/guide/packages/lucide-react] [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md]

**How to avoid:** Keep one public `Icon` API, but have core resolve names through explicit registries or generated maps that preserve per-icon imports where possible. Validate the exact import strategy during planning. [CITED:https://lucide.dev/guide/packages/lucide-react] [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md] [ASSUMED]

### Inline-style regression against the Sireno utility layer
**Confidence:** HIGH  
**What goes wrong:** New kit components fall back to ad hoc inline styles for layout, spacing, overflow, and typography, bypassing theme tokens and recreating mini-style systems inside each component. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/render/theme-utilities.ts]

**Why:** The current helpers still encode layout with inline styles, while the curated utility stylesheet is intentionally narrow and token-backed. Phase 28 specifically exists to move toward class-based TSX authoring on that existing layer. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

**How to avoid:** Add missing utility classes centrally in `theme-utilities.ts`, compose them with `cn()`, and reserve inline styles for values the curated utility layer cannot honestly express. [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: packages/cli/src/themes/utils/cn.ts]

### Accessibility gaps in a unified `Icon` primitive
**Confidence:** HIGH  
**What goes wrong:** Decorative icons get exposed to assistive tech unnecessarily, or icon-only actions put labels on the SVG instead of on the interactive control. [CITED:https://lucide.dev/guide/react/advanced/accessibility]

**Why:** Lucide’s React docs default icons to `aria-hidden="true"` unless given accessible labeling, and explicitly recommend labeling the button rather than the nested decorative icon. [CITED:https://lucide.dev/guide/react/advanced/accessibility]

**How to avoid:** Make the Sireno `Icon` primitive decorative by default, and let button-level components own action labels. Only expose icon accessibility props when the icon itself conveys essential standalone meaning. [CITED:https://lucide.dev/guide/react/advanced/accessibility]

## Existing Patterns in This Codebase

- **Mounted `render(props)` is already the real seam:** `defineMountedButton(...)` accepts `render(props)` and runtime handlers, then adapts them into the older `createInstance()` path. Planning should preserve this seam and remove presentation helpers, not add a second render abstraction. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

- **Runtime already normalizes root button wrapping:** if a button render does not return `ButtonSurface`, runtime wraps it automatically and extracts `full_surface` / `sample_interval_ms` from the root render output. That means the new UI kit can stay focused on content primitives unless it truly needs surface metadata. [VERIFIED: packages/cli/src/deck/runtime.ts]

- **The old helper surface is still heavily embedded:** helper factories remain exported from `addon/api.ts` and `src/index.ts`, and current built-ins/tests/fixtures still consume them across core-buttons, date-time, emoji-selector, runtime temporary-error decks, and fixture addons. Migration scope is broader than the three files named in the phase prompt. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/index.ts] [VERIFIED: packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

- **The utility layer is intentionally curated and small:** `theme-utilities.ts` currently exposes positioning, flex/grid, a tiny spacing set, theme-token color utilities, and typography role classes. A Phase 28 UI kit will almost certainly need a few more utilities for text overflow/marquee/chip layout, but the extension point already exists. [VERIFIED: packages/cli/src/render/theme-utilities.ts]

- **`cn()` is already the standard merge helper:** the repo has one class-composition utility built on `clsx` and `tailwind-merge`; there is no need to introduce a second merge helper. [VERIFIED: packages/cli/src/themes/utils/cn.ts]

- **Current dev scripts do not exercise the truthful runtime seam:** workspace root has no `cli:dev` script, root `dev` fans out to every package, and `packages/cli` still defines `dev` as `tsdown --watch`. That is a mismatch with the locked Phase 28 requirement to run `start --config config.yml` through `tsx`. [VERIFIED: package.json] [VERIFIED: packages/cli/package.json] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

- **Built-in action button file looks mid-cutover:** `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` currently mixes helper imports with malformed JSX/render syntax, so it is not a trustworthy style reference for the new kit and should be re-read fresh during planning. **Confidence: HIGH** [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx]

## Recommended Approach

The evidence supports treating Phase 28 as a contract cleanup around the already-shipped mounted `render(props)` path: introduce one core-owned TSX UI kit (`Icon`, `Chip`, `Text`) on top of the existing `cn()` + theme-utility layer, then migrate built-ins, fixtures, public exports, and helper-dependent tests onto that component surface instead of preserving helper factories in parallel. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/themes/utils/cn.ts] [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md]

For icons, keep one stable Sireno `Icon` API while core internally resolves generic icons through `lucide-react` and brand icons through `simple-icons`; keep accessibility decorative-by-default and flag brand-icon legal review as part of planning. **Confidence: HIGH for the package choices, MEDIUM for the exact internal registry shape.** [CITED:https://lucide.dev/guide/packages/lucide-react] [CITED:https://lucide.dev/guide/react/advanced/accessibility] [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md]

For `Text`, keep overflow behavior core-owned and theme presentation-only: the phase context is explicit that fit, marquee, ellipsis, and wrap are semantic contracts, not theme-specific behaviors. That likely means extending the curated utility stylesheet with overflow, white-space, animation, and alignment primitives rather than scattering inline styles across components. [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md] [VERIFIED: packages/cli/src/render/theme-utilities.ts]

For `cli:dev`, the truthful path is a workspace-root script that runs the real raw-source CLI entry through `tsx watch` and explicitly includes repo config/theme/addon paths in the watch graph; do not treat `tsdown --watch` as the primary dev loop for this phase. [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md] [VERIFIED: package.json] [VERIFIED: packages/cli/package.json] [VERIFIED: .planning/ROADMAP.md]

## Sources

- React official docs: component hierarchy, composition, and props [CITED:https://react.dev/learn/your-first-component] [CITED:https://react.dev/learn/thinking-in-react] [CITED:https://react.dev/learn/passing-props-to-a-component]
- Lucide official docs: React package overview and accessibility guidance [CITED:https://lucide.dev/guide/packages/lucide-react] [CITED:https://lucide.dev/guide/react/advanced/accessibility]
- TSX official docs / repo docs: watch mode and include/exclude behavior [CITED:https://github.com/privatenumber/tsx/blob/master/docs/watch-mode.md]
- Simple Icons official README: package usage, tree-shaking guidance, and legal disclaimer [CITED:https://raw.githubusercontent.com/simple-icons/simple-icons/develop/README.md]
