# Phase 29: Built-in Addon TSX Hard Cut + Tailwind Cleanup - Context

**Gathered:** 2026-05-27
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Remove the remaining legacy built-in addon rendering seams, make the built-in addon contract honestly component-first around the mounted `render(props)` model, eliminate `createElement`-style built-in authoring in favor of JSX/TSX, prefer the Sireno-owned Tailwind-style utility layer over inline styles, split built-in addons that expose multiple button definitions into one definition per file, and standardize the built-in date/time formatter on `dayjs` with `date_format` and `time_format` following Day.js token syntax. This phase does not broaden into richer date-time composition features such as multi-line segment layouts, per-segment color or font-size controls, or ticking/blinking format directives; those are separate capabilities and must be handled as future roadmap work.

## Implementation Decisions

### Legacy Contract Removal
- Phase 29 is a hard cut, not another compatibility phase.
- `LegacyAddonButtonDefinition` should be removed rather than retained as the named public contract.
- The runtime should also stop depending on the internal `createInstance()` bridge in this phase; planning should treat that removal as part of the work, not as a later cleanup.
- After this phase, built-ins and addon-facing core types should describe the mounted `render(props)` contract directly instead of presenting it as an adapter over a legacy instance model.

### Built-in File Organization
- Built-in addons that expose multiple button definitions must use one button-definition file per built-in button.
- The rule is strict for shipped built-ins such as `date-time` and `emoji-selector`; no file should define multiple built-in button definitions.
- Shared schemas, constants, metadata, and formatting/layout helpers may live in nearby support files inside the addon folder.
- The goal is a clean addon index plus explicit per-button ownership, not forced duplication.

### Styling Cleanup Boundary
- Built-in addon rendering should prefer the Sireno-owned utility class layer and TSX class composition over inline style objects.
- Inline style is still acceptable only for CSS features the current Sireno utility layer cannot express cleanly.
- If a missing style is simple and needed by a shipped built-in, planning should prefer adding a Sireno utility for it even when it is only used once today.
- Phase 29 should therefore treat simple remaining inline layout/text styles such as `gap`, `line-height`, `text-wrap`, padding, and similar cases as utility-surface debt to remove rather than acceptable permanent one-offs.

### Date/Time Formatting Contract
- Phase 29 should adopt `dayjs` as the built-in date/time formatting library instead of `momentjs` or the current hand-rolled formatter.
- `date_format` and `time_format` should use Day.js token syntax as the real config contract after this phase.
- Planning should account for the fact that this is a deliberate config-contract normalization, not merely an internal implementation swap.
- The formatting migration stays scoped to the existing date/time built-in fields rather than adding a richer formatting DSL in this phase.

### Agent's Discretion
- Exact TypeScript names and file layout for the post-legacy mounted button contract, as long as no legacy-named contract remains.
- Exact sequencing for removing the runtime `createInstance()` bridge while keeping verification reviewable and honest.
- Exact utility-class additions needed to eliminate the current simple inline styles from shipped built-ins.
- Exact support-file names and folder structure for split built-in addons, as long as each button definition has its own file.

## Specific Ideas

- `packages/cli/src/addon/api.ts` is the primary contract-cut seam because it still exports `LegacyAddonButtonDefinition`, aliases `AddonButtonDefinition` to that legacy name, and adapts mounted definitions through `createInstance(...)`.
- `packages/cli/src/deck/runtime.ts` is part of Phase 29 scope because the user explicitly chose to remove the internal `createInstance()` bridge rather than only renaming the public API surface.
- `packages/cli/src/builtin-addons/date-time/index.ts` currently bundles multiple button definitions plus formatting helpers and still uses `createElement` and inline styles; it is the clearest multi-button split target.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` also still bundles multiple button definitions in one file and should be reorganized onto one-button-per-file plus shared support files.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`, `change-deck.ts`, `toggle.ts`, and `media-sample.ts` are the obvious cleanup consumers for the remaining simple inline-style debt.
- `packages/cli/src/render/theme-utilities.ts` remains the source of truth for adding any Sireno-owned utility classes needed to replace simple built-in inline styles.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`
- `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/builtin-addons/date-time/index.ts`
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.ts`
- `packages/cli/src/render/theme-utilities.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/theme-utilities.ts` already owns the Sireno utility-class layer, so simple style cleanup should extend that surface rather than inventing a second styling mechanism.
- The Phase 28 component-first work already established TSX component usage and `Text`/`Icon`-based composition as the intended built-in authoring direction.
- Built-in addon folders already exist, so the one-button-per-file rule can be implemented with local support files rather than repo-wide structural churn.

### Established Patterns
- Recent phases have preferred hard contract cuts over public compatibility shims when the old contract is already considered wrong.
- The mounted `render(props)` contract is already the desired authoring model; planning should deepen that truth rather than preserving instance-era terminology.
- Sireno styling is intentionally a curated Tailwind-style utility surface backed by theme tokens, not a full Tailwind toolchain.

### Integration Points
- Remove the legacy button-definition naming and runtime bridge in `packages/cli/src/addon/api.ts` and `packages/cli/src/deck/runtime.ts`.
- Split built-in multi-button addon definitions across explicit per-button files inside `packages/cli/src/builtin-addons/date-time/` and `packages/cli/src/builtin-addons/emoji-selector/`.
- Replace built-in `createElement(...)` usage with TSX/JSX in the remaining shipped built-in button implementations.
- Extend `packages/cli/src/render/theme-utilities.ts` where simple built-in inline styles need first-class utilities.
- Migrate the built-in date/time formatter from the current custom token replacement to `dayjs`.

## Deferred Ideas

- Richer date-time formatting capabilities requested during discussion, including newline-aware layout segments, per-segment color controls, per-segment font-size controls, and ticking/blinking display directives. These are future-phase feature work, not Phase 29 cleanup scope.

---
*Phase: 29-built-in-addon-tsx-hard-cut-tailwind-cleanup*
*Context gathered: 2026-05-27*
