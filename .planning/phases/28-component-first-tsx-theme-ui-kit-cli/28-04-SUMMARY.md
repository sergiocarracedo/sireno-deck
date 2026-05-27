# Plan 28-04 Summary

**Completed:** 2026-05-27

## What was built
Finished Phase 28 with the truthful developer loop and closure artifacts the roadmap promised. The workspace root now exposes `cli:dev`, which runs the real raw-source CLI `start --config config.yml` seam through `tsx watch` and explicitly includes the non-imported repo paths that matter during development.

This plan also recorded the component-first cutover learnings in the repo's changelog and state breadcrumbs, so the reason for deleting the helper surface and the reason for preferring the repo-root raw-source watch loop remain inspectable after the phase ends.

## Key files
- `package.json`: added the workspace-root `cli:dev` script with explicit `tsx watch` includes for `packages/cli/src/**/*`, `config.yml`, `themes/**/*`, `addons/**/*`, and `builtin-addons/**/*`, and pointed root `dev` at that truthful runtime seam.
- `packages/cli/package.json`: changed the package-level `dev` script to delegate to the workspace-root `cli:dev` loop and renamed the old bundler-only watcher to `dev:bundle` so `tsdown --watch` no longer pretends to be the main Phase 28 dev path.
- `packages/cli/src/cli/commands/start.test.ts`: added a focused regression that inspects the root/package scripts and proves the watch command still points at the exact raw-source `start --config config.yml` seam plus the explicit include graph.
- `CHANGELOG.md` and `.planning/STATE.md`: recorded what broke in the old helper-factory model, what Phase 28 changed, and why the truthful watch-loop proof matters.

## Decisions made
- Kept the watch-loop proof narrow and explicit: one regression checks the real script text/include graph, while the existing start-path runtime tests continue proving the actual CLI seam behaves.
- Left `tsx watch` at the workspace root instead of inventing a second wrapper CLI or emulator-only shortcut, because the locked phase contract was to exercise the real startup seam developers actually run.
- Preserved pre-existing unrelated edits in `packages/cli/package.json` by staging only the script-surface change for this plan, so the commit stayed honest to Phase 28 scope.

## Notes for downstream
- Future non-imported developer inputs need to be added explicitly to the `cli:dev` include graph; plain dependency watching is still not enough.
- With `28-04` complete, Phase 28 now has all four plan slices executed. The next workflow step is phase-level verification/update, then `verify-work 28` for manual UAT.
