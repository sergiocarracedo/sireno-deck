# Phase 28 Verification

**Date:** 2026-05-27
**Status:** passed

## Verification Summary

Phase 28 passes verification. The repo now has one component-first TSX addon authoring surface built on the mounted `render(props)` seam, a presentation-only theme bridge for the shared `Icon` / `Chip` / `Text` primitives, shipped built-ins and runtime fallback UI migrated onto that surface, and a truthful workspace-root `cli:dev` loop that exercises the real raw-source `start --config config.yml` seam through `tsx watch`.

## Must-Have Checks

### 28-01
- Passed: `packages/cli/src/ui/Icon.tsx`, `Text.tsx`, and `Chip.tsx` exist and are exported from the public root surface in `packages/cli/src/index.ts`.
- Passed: `packages/cli/src/config/theme.ts` exposes an explicit typed `ui` presentation seam for `Icon` / `Chip` / `Text` instead of implying themes can override arbitrary TSX behavior.
- Passed: `Text` remains the core-owned fit contract (`wrap`, `ellipsis`, `shrink`, marquee) while the default theme only adds presentation wrappers/classes.
- Passed: the committed Phase 23 raw-source addon fixture renders through `ButtonSurface`, `Chip`, `Icon`, and `Text`, and startup/runtime tests prove it on the live loader/start seam.
- Passed: focused theme/dom-host coverage proves the shipped default theme can present the new kit on the real runtime path.

### 28-02
- Passed: the shipped core-button family (`action`, `change-deck`, `toggle`, `media-sample`) now renders through explicit TSX composition with the new kit instead of helper factories.
- Passed: runtime-owned temporary/fallback UI in `packages/cli/src/deck/runtime.ts` no longer depends on `createDom*` / `createBaseShape*` helpers.
- Passed: focused runtime/start coverage still proves runtime error-deck and core-button behavior on the live runtime seams.

### 28-03
- Passed: remaining shipped addon families (`date-time`, `emoji-selector`) no longer rely on helper factories and render through the new TSX kit.
- Passed: helper-factory exports were removed from `packages/cli/src/addon/api.ts` and `packages/cli/src/index.ts`, so the public addon surface no longer advertises the deleted contract.
- Passed: committed docs/examples/fixtures (`README.md`, Phase 9 example, Phase 23 fixture note, render proof) now describe the component-first authoring surface instead of helper-based alternatives.

### 28-04
- Passed: the workspace root exposes `cli:dev`, which runs `packages/cli/src/cli/index.ts start --config config.yml` through `tsx watch`.
- Passed: the watch loop explicitly includes `./packages/cli/src/**/*`, `./config.yml`, `./themes/**/*`, `./addons/**/*`, and `./builtin-addons/**/*`.
- Passed: `packages/cli/package.json` no longer presents `tsdown --watch` as the primary dev loop; it delegates `dev` to the workspace-root `cli:dev` and keeps bundler watching as `dev:bundle`.
- Passed: `CHANGELOG.md` and `.planning/STATE.md` record the Phase 28 cutover, root cause, and learnings.

## Requirement Coverage

Phase 28 is post-roadmap follow-on work and does not add new v1.2 requirement IDs. `REQUIREMENTS.md` remains milestone-scoped; verification instead checks the locked Phase 28 goal and must-haves from the plan set.

## Integration Checks

- `packages/cli/src/index.ts` exports `defineMountedButton`, `ButtonSurface`, `Chip`, `Icon`, and `Text`, and the committed Phase 23 raw-source addon imports that root surface successfully.
- `packages/cli/src/config/theme.ts` resolves `Theme.ui` presentation overrides, and the default theme exports `ui = { chip, icon, text }` through `packages/cli/src/themes/default/index.ts`.
- `package.json` `cli:dev` points at `packages/cli/src/cli/index.ts start --config config.yml`, and `packages/cli/src/cli/commands/start.test.ts` locks the same script/include graph.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/addon/loader.test.ts src/cli/commands/start.test.ts src/render/dom-host.test.tsx src/config/theme.test.ts src/builtin-addons/core-buttons/index.test.ts src/deck/runtime.test.ts src/builtin-addons/date-time/index.test.ts src/builtin-addons/emoji-selector/index.test.ts`
  - `8 passed` test files, `132 passed` tests
  - note: the expected mocked `capture failed` stderr still appears during the intentional failure-path startup test while the suite passes
- `pnpm exec node -e "const pkg=require('./package.json'); const script=pkg.scripts['cli:dev']; if (!script) throw new Error('missing cli:dev'); for (const token of ['tsx watch','packages/cli/src/cli/index.ts','start --config config.yml','--include ./packages/cli/src/**/*','--include ./config.yml','--include ./themes/**/*','--include ./addons/**/*','--include ./builtin-addons/**/*']) { if (!script.includes(token)) throw new Error('missing '+token) } console.log('cli:dev ok')"`
  - confirms the root `cli:dev` script points at the truthful raw-source CLI seam and explicit include graph
- `rg -n "createDomIcon|createDomTextLabel|createDomStack|createBaseShape" packages/cli/src --glob '*.{ts,tsx}'`
  - returns no remaining helper-factory usage in shipped source under `packages/cli/src`
- `rg -n "Icon|Text|Chip|component-first" README.md packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx packages/cli/fixtures/phase-23/README.md`
  - confirms the public docs/examples/fixtures match the component-first contract

## Residual Notes

- Phase 28 is post-roadmap follow-on work and does not introduce a new v1.2 requirement ID; milestone requirements remain unchanged.
- The next workflow step is `verify-work 28` for manual UAT, then `/review` → `/ship` → `/compound`.
