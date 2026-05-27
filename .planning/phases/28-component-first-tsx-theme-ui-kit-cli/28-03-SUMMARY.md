# Plan 28-03 Summary

**Completed:** 2026-05-27

## What was built
Finished the Phase 28 hard cut away from helper-factory addon authoring. The remaining shipped addon families (`date-time` and `emoji-selector`) now render through the component-first TSX kit, the public addon surface no longer exports helper factories, and the repo's own tests/examples/docs were moved onto the same contract so the shipped story matches the documented one.

This plan intentionally landed in two clean steps. First, the shipped addon/runtime-facing code and the helper-dependent test doubles moved off `createDom*` and `createBaseShape*` so the helper API could be removed honestly. Second, the public docs and committed examples were rewritten so addon authors are pointed at `defineMountedButton`, `ButtonSurface`, `Icon`, `Chip`, and `Text` instead of deleted helper utilities.

## Key files
- `packages/cli/src/builtin-addons/date-time/index.ts` and `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`: moved locked-time, analog, calendar, and digital date-time rendering onto `Text` plus normal TSX composition while preserving cadence and visible output.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`: replaced helper-built category/entry/back button trees with explicit `Icon` + `Text` composition, preserving addon asset references and emoji fallback behavior.
- `packages/cli/src/addon/api.ts` and `packages/cli/src/index.ts`: removed helper-factory implementations and re-exports so the public addon API no longer advertises the deleted compatibility surface.
- `packages/cli/src/deck/runtime.test.ts`, `packages/cli/src/cli/commands/start.test.ts`, `packages/cli/src/builtin-addons/core-buttons/index.test.ts`, and `packages/cli/src/render/dom-host.test.tsx`: migrated helper-dependent test seams to the public TSX kit so the hard cut stays executable.
- `README.md`, `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx`, and `packages/cli/fixtures/phase-23/README.md`: rewrote the public authoring narrative around the mounted `render(props)` seam and the component-first kit.

## Decisions made
- Removed the helper surface completely instead of leaving a shadow compatibility layer, because Phase 28 explicitly locked a hard cut rather than a parallel migration path.
- Migrated the small number of helper-based test doubles in the same task as the public export removal so verification stayed honest.
- Kept the docs rewrite narrow and executable: the README and committed fixtures/examples now describe the exact public surface the runtime and tests already prove.

## Notes for downstream
- Phase 28's authoring cutover is now complete in shipped addon code and public docs/examples.
- Wave 4 still needs to add the truthful workspace-root `cli:dev` watch loop and record the cutover learnings in `CHANGELOG.md` and `.planning/STATE.md`.
