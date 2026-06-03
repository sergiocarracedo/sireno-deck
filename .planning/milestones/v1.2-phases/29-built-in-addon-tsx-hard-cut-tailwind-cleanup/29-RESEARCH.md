# Phase 29: Built-in Addon TSX Hard Cut + Tailwind Cleanup - Research

**Researched:** 2026-05-27
**Phase goal:** Remove remaining legacy built-in addon rendering seams, require JSX/TSX-first button authoring with Tailwind-first styling, split multi-button built-in addons into per-button files, and standardize date/time formatting on one dedicated library. [VERIFIED: .planning/ROADMAP.md]

**Confidence legend:** HIGH = official docs and local code agree, MEDIUM = official docs plus one inferred implementation consequence, LOW = useful hypothesis that still needs validation during execution.

## Don't Hand-Roll

| Problem | Recommended solution | Why |
|---------|----------------------|-----|
| Final legacy button-definition cut | Remove `LegacyAddonButtonDefinition`, stop adapting mounted definitions through `createInstance(...)`, and make `AddonButtonDefinition` mean the mounted `render(props)` contract directly. **Confidence: HIGH** [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] | The repo already treats mounted `render(props)` as the truthful seam from Phase 24 onward; keeping the adapter after the user explicitly chose a hard cut would preserve the lie instead of removing it. [VERIFIED: .planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] |
| Button metadata transport | Keep `ButtonSurface` as the explicit metadata carrier or replace it with another equally explicit metadata transport, but do not assume React `Fragment` can carry `data-sireno-*` attributes. **Confidence: HIGH** [CITED:https://react.dev/reference/react/Fragment] [VERIFIED: packages/cli/src/addon/api.ts] | React documents `Fragment` as a grouping primitive without arbitrary DOM attributes, while Sireno currently uses `ButtonSurface` to carry `data-sireno-full-surface` and `data-sireno-sample-interval-ms` metadata that runtime scrapes from the rendered tree. [CITED:https://react.dev/reference/react/Fragment] [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts] |
| Built-in styling cleanup | Extend `packages/cli/src/render/theme-utilities.ts` with the narrow missing utilities and migrate built-ins to `className` composition instead of leaving simple inline `gap`, padding, rounding, `lineHeight`, or `textWrap` values in place. **Confidence: HIGH** [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] | Phase 28 already locked the Sireno-owned Tailwind-style utility layer as the styling seam, and Phase 29 context explicitly says simple built-in inline styles are utility-surface debt, not acceptable permanent exceptions. [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] |
| Built-in file organization | Split each shipped multi-button addon into one definition file per button and keep schemas/helpers/constants in local support files. **Confidence: HIGH** [VERIFIED: packages/cli/src/builtin-addons/date-time/index.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] | The user chose a strict one-button-per-file rule for shipped built-ins, but also explicitly allowed shared support files to avoid duplicating formatter and metadata logic. [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-DISCUSSION-LOG.md] |
| Date/time formatting contract | Adopt `dayjs` and wire any supported non-core token families through explicit Day.js plugins instead of preserving a hidden Sireno token dialect. **Confidence: HIGH** [CITED:https://day.js.org/docs/en/display/format] [CITED:https://day.js.org/docs/en/plugin/plugin] [CITED:https://momentjs.com/docs/] [VERIFIED: packages/cli/src/builtin-addons/date-time/index.ts] | Day.js is a maintained modern formatter and Moment describes itself as a legacy maintenance project; Day.js also documents that advanced and localized token families require explicit plugin setup, so the honest contract is "Day.js tokens we intentionally support," not another undocumented partial clone. [CITED:https://day.js.org/docs/en/display/format] [CITED:https://day.js.org/docs/en/plugin/plugin] [CITED:https://momentjs.com/docs/] |

## Common Pitfalls

### Rename-only legacy removal
**Confidence:** HIGH  
**What goes wrong:** `LegacyAddonButtonDefinition` disappears from the exported names, but `defineMountedButton(...)` still quietly adapts through `createInstance(...)`, so runtime/tests keep thinking in instance-era terms and the phase only repaints the seam. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

**Why:** The current adapter is explicit and central, which is good for migration, but Phase 29 context and user choices locked a real hard cut rather than another compatibility phase. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-DISCUSSION-LOG.md]

**How to avoid:** Make runtime consume mounted definitions natively in the same slice that removes the old type names, and update the focused tests that currently call `definition.createInstance(...)` so the proof moves with the contract. [VERIFIED: packages/cli/src/deck/runtime.test.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/index.test.ts] [VERIFIED: packages/cli/src/render/dom-host.test.tsx]

### Losing `ButtonSurface` metadata while removing `createElement`
**Confidence:** HIGH  
**What goes wrong:** Built-ins get rewritten to TSX fragments or plain nodes, but runtime loses `full_surface` and `sample_interval_ms` metadata because the wrapper element carrying `data-sireno-*` attributes disappears. [CITED:https://react.dev/reference/react/Fragment] [VERIFIED: packages/cli/src/addon/api.ts]

**Why:** In this repo `ButtonSurface` is not just presentation scaffolding; it is the current transport for runtime metadata, and React `Fragment` does not provide an equivalent arbitrary-attribute escape hatch. [CITED:https://react.dev/reference/react/Fragment] [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

**How to avoid:** Keep `ButtonSurface` as a TSX component with a truthful utility-backed wrapper (`className="contents"`) or replace the metadata mechanism deliberately and update runtime extraction/tests in the same plan. [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: packages/cli/src/addon/api.ts] [ASSUMED]

### Day.js plugin drift masked as "direct token support"
**Confidence:** HIGH  
**What goes wrong:** The code claims `date_format` and `time_format` are plain Day.js tokens, but execution only supports core tokens while tests/docs/examples accidentally rely on localized or advanced tokens like `LTS` or `Do`. [CITED:https://day.js.org/docs/en/display/format]

**Why:** Day.js documents plugin-gated token families explicitly: localized formats require `LocalizedFormat`, while tokens such as `Do`, `Q`, `k`, `kk`, `X`, and `x` require `AdvancedFormat`. [CITED:https://day.js.org/docs/en/display/format] [CITED:https://day.js.org/docs/en/plugin/plugin]

**How to avoid:** Decide the supported token surface during execution, wire the exact plugins intentionally, and lock it with focused tests plus config-facing examples that match the real support level. [CITED:https://day.js.org/docs/en/display/format] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md]

### One-button-per-file split that breaks test coverage or runtime lookups
**Confidence:** HIGH  
**What goes wrong:** Definitions move into separate files, but addon indexes stop exporting the same button ids/constants, helper exports vanish, or tests keep importing old monolithic modules. [VERIFIED: packages/cli/src/builtin-addons/date-time/index.ts] [VERIFIED: packages/cli/src/builtin-addons/date-time/index.test.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.test.ts]

**Why:** The current monolithic files bundle both public addon registration and helper/test exports, so splitting files safely is partly a module-boundary problem, not just a formatting cleanup. [VERIFIED: packages/cli/src/builtin-addons/date-time/index.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts]

**How to avoid:** Keep the addon `index.ts` as the stable registry surface, move helpers into nearby support modules with intentional exports, and update tests to import through the new stable paths rather than relying on a single giant file existing forever. [VERIFIED: packages/cli/src/builtin-addons/date-time/index.test.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.test.ts]

### Simple inline-style debt surviving the cleanup phase
**Confidence:** HIGH  
**What goes wrong:** Files switch from `createElement(...)` to TSX, but still keep inline `style={{ gap: '6px' }}` and similar one-off values, so the phase removes syntax noise without actually proving the utility-first styling contract. [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts]

**Why:** The current utility surface is close but not complete for built-in needs, and the easy way out is to preserve small inline styles instead of adding missing classes centrally. [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md]

**How to avoid:** Treat utility additions as part of the slice, keep them narrow and named around existing Tailwind-style conventions, and reserve inline styles only for features the curated utility layer genuinely cannot represent. [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md]

## Existing Patterns in This Codebase

- **Mounted `render(props)` is already the real authoring seam:** `defineMountedButton(...)` exists today only to adapt mounted definitions back into the old instance contract, so the codebase is already logically on the new model even though the types/runtime still preserve the bridge. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

- **`ButtonSurface` already carries metadata through a wrapper element:** the wrapper currently uses `display: contents` plus `data-sireno-*` attributes, so a TSX rewrite can stay minimal if it keeps that behavior instead of redesigning metadata transport mid-phase. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/render/theme-utilities.ts]

- **Date-time and emoji-selector are the obvious structural offenders:** both addons still define multiple button definitions from one file, and the date-time addon additionally owns the hand-rolled formatting contract that Phase 29 is supposed to replace. [VERIFIED: packages/cli/src/builtin-addons/date-time/index.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts]

- **Core-buttons are mostly a styling and syntax cleanup, not a registry redesign:** that addon already uses separate button files, but several files are still `.ts` plus `createElement(...)` and inline style objects. [VERIFIED: packages/cli/src/builtin-addons/core-buttons/index.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx]

- **Tests still preserve the old mental model in several places:** focused runtime, DOM-host, start-path, and built-in tests still exercise `createInstance(...)`, so the phase must migrate proof seams together with code instead of leaving tests to describe a dead API. [VERIFIED: packages/cli/src/deck/runtime.test.ts] [VERIFIED: packages/cli/src/render/dom-host.test.tsx] [VERIFIED: packages/cli/src/cli/commands/start.test.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/index.test.ts]

- **The repo already carries the two most relevant planning lessons:** keep live visuals inside the existing button variant seam instead of broadening renderer semantics, and keep tests/file references anchored to stable file-relative paths while moving fixtures/support files. [VERIFIED: .planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md] [VERIFIED: .planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md]

## Recommended Approach

Phase 29 should execute as three ordered slices. First, remove the legacy contract honestly in `packages/cli/src/addon/api.ts` and `packages/cli/src/deck/runtime.ts`, migrate runtime-owned fallback UI plus the focused proof tests off `createInstance(...)`, and keep `ButtonSurface` as the explicit metadata boundary unless runtime deliberately replaces it in the same slice. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md]

Second, convert the date-time addon into the canonical Phase 29 proof family: one definition file per shipped date/time button, shared support files for schemas and formatting, and a `dayjs`-backed formatter with explicit plugin setup for any token families the product chooses to support. This slice should keep the locked-time tile and analog/calendar behavior on the existing render variants rather than inventing a richer formatting DSL. [CITED:https://day.js.org/docs/en/display/format] [VERIFIED: packages/cli/src/builtin-addons/date-time/index.ts] [VERIFIED: .planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md]

Third, finish the remaining shipped built-ins by extending `theme-utilities.ts` just enough to absorb their simple inline-style debt, then migrate emoji-selector and core-buttons onto TSX/class-based rendering with stable addon indexes and updated tests. That keeps the phase focused on truthful built-in authoring and utility-first styling instead of drifting into new renderer capabilities. [VERIFIED: packages/cli/src/render/theme-utilities.ts] [VERIFIED: packages/cli/src/builtin-addons/emoji-selector/index.ts] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/index.ts] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md]

## Sources

- React official docs: `Fragment` reference and limits [CITED:https://react.dev/reference/react/Fragment]
- Day.js official docs: formatting tokens and plugin model [CITED:https://day.js.org/docs/en/display/format] [CITED:https://day.js.org/docs/en/plugin/plugin]
- Moment official docs: project status / legacy maintenance positioning [CITED:https://momentjs.com/docs/]
- Local Sireno planning/code references: Phase 24 and Phase 28 contexts, Phase 29 context/discussion, addon API/runtime/built-in addon sources, and relevant solutions [VERIFIED: .planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md] [VERIFIED: .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-DISCUSSION-LOG.md] [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]
