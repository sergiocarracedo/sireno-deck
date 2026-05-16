# Plan 05-01 Summary

**Completed:** 2026-05-13

## What was built
Phase 5 now has a real addon-first bootstrap path instead of only planning artifacts. The CLI gained a bundled addon registry, a first bundled addon package, a two-stage config validation flow that resolves bundled button definitions before payload validation, and a generic runtime host that renders registry-backed button instances instead of hardcoded built-in button behavior.

## Key files
- `packages/cli/src/addon/api.ts`: defines the v1 addon button contract and runtime methods.
- `packages/cli/src/addon/registry.ts`: stores registry-backed button definitions and rejects duplicates.
- `packages/cli/src/addon/builtin.ts`: exposes bundled addons through the shared registration path.
- `packages/cli/src/core/schemas.ts`: replaces the built-in button union with bootstrap config parsing plus registry-backed payload validation.
- `packages/cli/src/config/loader.ts`: creates the bundled registry and runs bootstrap-aware validation.
- `packages/cli/src/deck/runtime.ts`: hosts addon button instances generically and renders them through the existing reconciler path.
- `builtin-addons/core-buttons/src/index.ts`: provides the first bundled button type, `builtin-display-text`.

## Decisions made
- Kept the first bundled tracer bullet intentionally narrow: one bundled display button type was enough to prove the registry, loader, and runtime-host path without solving external addon loading yet.
- Preserved the existing React render bridge and image pipeline so the architecture pivot stayed focused on validation and runtime ownership.

## Deviations
- The old runtime test suite encoded the pre-Phase-5 built-in architecture directly, so Task `05-01-03` replaced those tests with focused addon-host bootstrap coverage instead of preserving invalid legacy expectations.

## Notes for downstream
- Plan `05-02` should build on `createBundledAddonRegistry()` and the runtime host rather than reintroducing built-in special cases for external addons.
- External addon manifests and load isolation are still pending; `05-01` only proves the bundled-addon slice.
