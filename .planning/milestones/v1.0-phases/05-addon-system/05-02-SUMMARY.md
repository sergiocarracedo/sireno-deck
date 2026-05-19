# Plan 05-02 Summary

**Completed:** 2026-05-13

## What was built
Phase 5 now loads real external addons instead of only bundled definitions. The CLI gained a manifest validator and unified loader for local-folder and npm addons, then startup was refactored to bootstrap external addon registrations before full config validation so healthy addons keep loading when a sibling addon is broken.

## Key files
- `packages/cli/src/addon/manifest.ts`: validates addon package metadata and distinguishes invalid manifests from fatal `apiVersion` mismatches.
- `packages/cli/src/addon/loader.ts`: resolves local and npm addon roots, imports addon entrypoints, and returns warning-worthy failures separately from fatal version mismatches.
- `packages/cli/src/config/loader.ts`: exposes a bootstrap config read path so startup can discover addon declarations before full button validation.
- `packages/cli/src/cli/commands/start.ts`: loads bundled addons first, then external addons, logs startup warnings for recoverable failures, and stops on incompatible addon API versions.
- `packages/cli/src/cli/commands/start.test.ts`: proves startup warning behavior without needing hardware access.
- `packages/cli/src/config/loader.test.ts`: proves external addon-backed payload validation still keeps line/path metadata intact.

## Decisions made
- Treated addon `apiVersion` mismatches as fatal startup errors instead of warnings because continuing would leave the config/runtime contract undefined.
- Kept broken manifests and import failures isolated as warnings so one bad addon does not block unrelated healthy addons.

## Notes for downstream
- Plan `05-03` can rely on one shared loader path for bundled and external addons; there is no separate startup contract left to reconcile.
- The sample `config.yml` now documents both local-folder and npm addon declarations under the addon-first model.
