# Phase 33: Add full tailwind support — Research

**Researched:** 2026-06-02
**Phase goal:** Enable full Tailwind support across the browser-rendered UI surface so shared components, themes, and addon-authored TSX can rely on a consistent utility-first styling contract.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| Real utility CSS generation for browser-rendered TSX surfaces | Adopt real Tailwind CSS v4 with `tailwindcss` plus `@tailwindcss/cli` and compile a static stylesheet asset | Tailwind already solves utility generation, static scanning, and watch-mode rebuilds; Phase 33 explicitly rejects extending Sireno's handwritten utility clone | [CITED: https://tailwindcss.com/docs/installation/tailwind-cli] |
| Workspace-bounded content detection for core, themes, and local addons | Use a Tailwind input stylesheet with explicit `@source` directives rooted to the repo surfaces Sireno wants to support | Tailwind v4 scans plain-text source tokens, ignores CSS and gitignored content by default, and supports explicit source registration for monorepo or non-default paths | [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files] |
| Dynamic class support without lying about runtime compilation | Use an explicit safelist-generation contract via `@source inline(...)` or generated static sources rather than runtime string interpolation | Tailwind does not understand dynamic string construction; only complete statically discoverable classes or explicit safelist entries are truthful | [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files] |
| Theme-token-backed utility styling | Keep Sireno theme resolution authoritative and bridge into Tailwind through CSS variables and Tailwind theme/custom utility definitions | Tailwind v4 is explicitly CSS-variable-first and supports utility usage against CSS variables; this matches the locked `--sireno-*` browser contract instead of replacing it | [CITED: https://tailwindcss.com/docs/functions-and-directives] [CITED: https://tailwindcss.com/docs/theme] |
| Remaining Sireno-only runtime behavior like shrink-fit, marquee, and rich-text helpers | Keep a narrow Sireno-owned runtime glue stylesheet separate from Tailwind-generated generic utilities | The repo already has browser-only runtime CSS behaviors that are product logic, not general Tailwind utilities; replacing those with hand-waved Tailwind equivalents would widen scope and risk regressions | [VERIFIED: codebase scan] |

## Common Pitfalls

### Dynamic class names silently disappear
**What goes wrong:** Utility classes built through interpolation like ``bg-${tone}-500`` never compile, so browser output looks unstyled in real runs.
**Why:** Tailwind scans source files as plain text and only generates classes it can see as complete tokens. It does not evaluate JS or TS expressions. [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files]
**How to avoid:** Keep class variants in static maps, and route any truly runtime-driven utility needs through an explicit safelist-generation contract. This exactly matches the user’s locked Phase 33 decision to reject runtime compilation magic. [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files] [VERIFIED: 33-CONTEXT.md]

### Source detection drifts in monorepo-style or root-run workflows
**What goes wrong:** Tailwind misses classes from themes, built-ins, or local addons when the build runs from the workspace root and relies on default discovery.
**Why:** Tailwind’s scan base defaults to the current working directory, and ignored paths like gitignored trees or external-like folders need explicit registration. [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files]
**How to avoid:** Use one canonical Tailwind input stylesheet with explicit `@source` directives for `packages/cli/src`, `builtin-addons`, `themes` TSX sources if any, and workspace `addons/`. Keep the scan boundary narrow and honest instead of promising arbitrary npm addon package support in this phase. [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files] [VERIFIED: 33-CONTEXT.md]

### Tailwind becomes a second theme system
**What goes wrong:** Teams start defining colors, fonts, and spacing directly in Tailwind-owned tokens that diverge from the resolved Sireno theme contract.
**Why:** Tailwind makes custom theme values easy, so without a locked ownership rule the utility layer can drift away from the existing `--sireno-*` browser truth. [CITED: https://tailwindcss.com/docs/functions-and-directives] [VERIFIED: codebase scan]
**How to avoid:** Keep Sireno theme resolution as the source of truth, export the full resolved theme as CSS vars on the browser deck root, and define Tailwind-facing tokens/utilities in terms of those vars. Do not let shipped browser surfaces invent an independent Tailwind-owned color or typography contract. [VERIFIED: 33-CONTEXT.md] [VERIFIED: codebase scan]

### The dev loop lies even when production output works
**What goes wrong:** `pnpm cli:dev` restarts the CLI but Tailwind CSS stays stale, or Tailwind rebuilds but the running browser deck still serves old CSS.
**Why:** Phase 33 spans both style generation and runtime delivery. A static CSS file alone is not enough if the watch loop does not rebuild it and the browser document injection seam does not load the updated asset. [VERIFIED: codebase scan]
**How to avoid:** Treat Tailwind generation as part of the truthful `cli:dev` seam, not a side command. Plan the watch/build/output path together with document injection and regression proof so the same seam developers use is the one that stays correct. [VERIFIED: 33-CONTEXT.md] [VERIFIED: package.json] [VERIFIED: packages/cli/package.json]

### Hard-cut migration leaves hidden utility dependencies behind
**What goes wrong:** Shared UI appears mostly correct, but niche utilities or tests still depend on `getThemeUtilityStylesheet()` emitting legacy generic classes.
**Why:** The current stylesheet mixes three concerns in one place: theme vars, generic utility classes, and Sireno-only runtime helpers. A hard cut can miss callers if those concerns are not separated first. [VERIFIED: codebase scan]
**How to avoid:** Split generic Tailwind-generated CSS from Sireno runtime glue deliberately, then migrate shared/core/built-in callers onto canonical Tailwind classes while trimming the old generated utility sheet down to the product-only rules that Tailwind should not own. [VERIFIED: 33-CONTEXT.md] [VERIFIED: codebase scan]

## Existing Patterns in This Codebase

- **Theme vars already exist at the correct seam:** `packages/cli/src/render/theme-utilities.ts` exports the resolved `--sireno-*` browser variables today, including color and typography-role data. Reuse that source-of-truth behavior instead of inventing a second theme resolver. [VERIFIED: codebase scan]
- **The browser document already has a stylesheet injection seam:** `packages/cli/src/render/dom-host-deck-document.tsx` injects `props.themeStylesheet` as `<style data-sireno-theme-utilities="true">...` and applies resolved theme variables to `#deck-root`. This is the natural place to swap from inline handwritten utilities to loading prebuilt Tailwind output plus narrower Sireno glue. [VERIFIED: codebase scan]
- **`cn()` is already Tailwind-aware:** `packages/cli/src/themes/utils/cn.ts` wraps `clsx` with `tailwind-merge`, so class merging does not need a new helper. [VERIFIED: codebase scan]
- **The authoring surface already looks like Tailwind:** Shared UI and built-in addon TSX files already use utility-shaped class strings like `flex`, `gap-1.5`, `rounded-full`, `min-w-0`, and arbitrary values such as `leading-[0.85]`. The repo’s pain is missing real Tailwind generation, not lack of Tailwind-shaped authoring. [VERIFIED: codebase scan]
- **`cli:dev` is already the truthful watch seam:** workspace `package.json` runs `pnpm exec tsx watch ... packages/cli/src/cli/dev-watch.ts` and includes `packages/cli/src`, `config.yml`, `themes/**/*`, `addons/**/*`, and `builtin-addons/**/*`. Tailwind build/watch must plug into this seam instead of creating a second pretend dev loop. [VERIFIED: package.json]
- **Phase history already narrowed the contract:** Phase 19 introduced Sireno-backed theme-token utilities, and Phases 28/29 intentionally kept a curated handwritten utility layer instead of real Tailwind. Phase 33 is therefore a deliberate contract change, not a surprise incremental tweak. [VERIFIED: 19-CONTEXT.md] [VERIFIED: 28-CONTEXT.md] [VERIFIED: 29-CONTEXT.md]

## Recommended Approach

Adopt Tailwind CSS v4 as a real build-time dependency and generate one prebuilt browser stylesheet asset from a Sireno-owned Tailwind entry CSS that explicitly registers only the supported workspace sources. [CITED: https://tailwindcss.com/docs/installation/tailwind-cli] [CITED: https://tailwindcss.com/docs/detecting-classes-in-source-files]

Keep Sireno theme resolution authoritative by continuing to export resolved `--sireno-*` variables on the browser deck root, and bridge Tailwind utilities to those variables rather than moving design-token ownership into Tailwind. [VERIFIED: codebase scan] [CITED: https://tailwindcss.com/docs/functions-and-directives]

Plan the phase in three reviewable cuts: first land the real Tailwind build and document-delivery seam, then migrate shared/core and built-in browser surfaces off the handwritten generic utility sheet, then wire workspace addon/theme scan plus explicit safelist generation into the truthful `cli:dev` loop with regression proof. [VERIFIED: 33-CONTEXT.md] [VERIFIED: package.json]
