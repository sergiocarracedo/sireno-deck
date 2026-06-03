# Phase 28: Component-First TSX Theme UI Kit + CLI Watch Mode - Context

**Gathered:** 2026-05-27
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Move the UI/render path to explicit JSX/TSX component-first authoring, remove the existing `createDomIcon`-style helper contract instead of keeping helper-factory rendering as a parallel public API, keep styling on the existing Sireno-owned tailwind-style utility layer plus `cn`, add a workspace-root `p cli:dev` watch loop that runs the real CLI `start --config config.yml` path through `tsx` and restarts on relevant source/config/theme/addon edits, and introduce a reusable UI kit with `Icon`, `Chip`, and `Text` components that themes can customize at the presentation layer. This phase does not adopt full Tailwind build tooling, does not create a second addon render contract beside mounted `render(props)`, and does not broaden scope into unrelated new widgets or a separate GUI/dev-server product.

## Implementation Decisions

### Migration Boundary
- Remove the old helper API in this phase instead of carrying compatibility shims forward.
- `createDomIcon`, `createDomTextLabel`, `createDomStack`, and the `createBaseShape*` helpers should stop being the supported public addon authoring contract.
- Planning should treat this as a real contract cutover: built-ins, shipped fixtures, public exports, and docs move to TSX/components rather than helper factories.

### UI Kit Ownership
- Core owns the stable public API for `Icon`, `Chip`, and `Text`.
- Themes may customize those components, but only at the presentation layer; the prop contract and core behavior remain authoritative.
- Theme customization should feel similar in spirit to theme-owned `buttonFrame`, but without allowing per-theme behavior drift in the text-fitting or icon-resolution rules.

### Text Contract
- `Text` becomes the new canonical text contract instead of a thin wrapper over the old helper-level `fit` seam.
- The canonical `Text` mode set should cover adapt-to-width font sizing, marquee, ellipsis, and wrap.
- Marquee should animate automatically when content overflows; authors should not need a second trigger prop in the first rollout.
- Phase 12 text-fit decisions still constrain the rollout: the new contract replaces the old seam, but planning must preserve the existing truthfulness around readable text behavior instead of inventing hidden renderer heuristics.

### Icon Contract
- Ship one `Icon` component API instead of separate generic and brand-icon primitives.
- Use Lucide as the generic icon source.
- Use Simple Icons as the brand-icon source.
- Planning should expect one stable API that can select between icon libraries through props or a similarly explicit contract, rather than forcing authors to learn multiple icon components.

### CLI Watch Loop
- Add a workspace-root `cli:dev` script so `p cli:dev` runs the real CLI `start --config config.yml` seam through `tsx`.
- The first-class dev loop target is the real `start` path, not emulator mode.
- The watch loop should restart on changes to CLI source plus repo config/theme/addon files relevant to local development, not just TypeScript source files.
- The existing `packages/cli` `dev` script based on `tsdown --watch` is no longer the desired primary developer loop for this phase.

### Styling Contract
- Keep styling on the existing Sireno-owned tailwind-style utility contract and `cn`, not a full Tailwind compiler/toolchain rollout.
- Use class-based styling where practical and avoid inline styles when the current utility surface can express the same behavior cleanly.
- If new utilities are needed, they should extend the curated utility surface in the existing render/theme layer rather than introducing a second styling system.

### Agent's Discretion
- Exact file/module structure for the new UI kit, as long as addon authors get one obvious component-first API.
- Exact prop names and composition details for `Icon`, `Chip`, and `Text`, as long as the locked behavior and ownership decisions above are preserved.
- Exact watch implementation for `cli:dev` and how restart orchestration is wired through `tsx`, as long as the real `start --config config.yml` seam is exercised and the agreed watch scope is covered.
- Exact utility-class additions needed to replace current inline-style usage where practical without forcing a full Tailwind adoption.

## Specific Ideas

- `packages/cli/src/addon/api.ts` is the main cutover seam because it still exports `createDomIcon`, `createDomTextLabel`, `createDomStack`, and `createBaseShape*`, and built-in buttons still call those helpers directly.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`, `change-deck.ts`, and `toggle.ts` are the most obvious first consumers to migrate from helper-factory rendering to explicit TSX components.
- `packages/cli/src/themes/utils/cn.ts` already provides the class-composition helper that the new component layer should standardize on.
- `packages/cli/src/render/theme-utilities.ts` is the current utility-stylesheet source of truth, so any new tailwind-style classes should extend that surface rather than bypassing it.
- Workspace-root `package.json` lacks a `cli:dev` script, and `packages/cli/package.json` still points `dev` at `tsdown --watch`; Phase 28 should make the runtime dev loop truthful for the real CLI path.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md`
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`
- `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`
- `.planning/phases/27-theme-fallback-and-emulator-shell/27-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts`
- `packages/cli/src/render/theme-utilities.ts`
- `packages/cli/src/themes/utils/cn.ts`
- `package.json`
- `packages/cli/package.json`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/themes/utils/cn.ts` already wraps `clsx` plus `tailwind-merge`, so Phase 28 does not need a new class-composition helper.
- `packages/cli/src/render/theme-utilities.ts` already publishes the Sireno-owned utility class surface and theme-token CSS variables used by browser-rendered output.
- The mounted `render(props)` contract in `packages/cli/src/addon/api.ts` already provides the correct runtime seam for component-first authoring.

### Established Patterns
- Phase 19 explicitly chose a Sireno-owned tailwind-style utility layer backed by theme CSS variables instead of adopting Tailwind as a full compile-time subsystem.
- Phase 23 and Phase 27 locked TSX as a truthful runtime authoring path; planning should preserve that truthfulness instead of reintroducing helper-factory workarounds or ambient React-import crutches.
- Phase 24 locked the mounted button contract with core-owned runtime behavior and `render(props)`, so the new UI kit should deepen that contract rather than inventing a separate render abstraction.

### Integration Points
- Replace helper exports and helper-backed built-in rendering in `packages/cli/src/addon/api.ts` and the built-in button implementations.
- Introduce the new component kit on the existing addon/theme/render boundary so built-ins and addons consume the same component-first contract.
- Extend the curated utility surface in `packages/cli/src/render/theme-utilities.ts` where component styling cannot reuse existing classes.
- Add workspace-root `cli:dev` script wiring in `package.json` and update `packages/cli/package.json` scripts as needed so runtime dev flow uses `tsx` on the real CLI start seam.

## Deferred Ideas

- Full Tailwind build-system adoption or broad compile-time class scanning.
- Theme-specific behavior overrides that change `Text` semantics per theme instead of only changing presentation.
- Separate brand and generic icon components as parallel public API if one `Icon` contract suffices.

---
*Phase: 28-component-first-tsx-theme-ui-kit-cli*
*Context gathered: 2026-05-27*
