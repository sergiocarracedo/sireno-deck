# Phase 10 — Public Authoring Exports

Gap-closure phase created from the v1.1 milestone audit.

## Goal

Make the documented addon authoring entrypoints shippable from the built CLI package by aligning `packages/cli` build outputs with the public exports promised in `packages/cli/package.json`.

## Closes

- Integration: package exports → built `dist/` output mismatch
- Flow: packaged addon authoring path described in `README.md` is not consumable by external addon authors

## Expected planning focus

1. Emit the public files promised by the package exports
2. Expose a real public helper API surface for addon authoring
3. Re-verify the release-facing addon authoring flow against built output
