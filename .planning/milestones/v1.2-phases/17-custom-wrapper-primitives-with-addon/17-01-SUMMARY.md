# Plan 17-01 Summary

**Completed:** 2026-05-20

## What was built
Phase 17 now has an explicit contract for default base-shape rendering versus explicit full-surface rendering. The render transport, config validation, runtime validation, and CLI render path all understand `full_surface: true`, while already-shipped `wrapper_id` config continues to work as compatibility for the shared/default base-shape path instead of breaking during the terminology shift.

This slice also added a committed Phase 17 wrapper-compatibility fixture and UAT path so the legacy `wrapper_id` behavior is reviewable on the shipped CLI/device surface rather than only in schema or runtime tests.

## Key files
- `packages/cli/src/render/types.ts`: adds `full_surface` to the public button render contract.
- `packages/cli/src/render/reconciler.ts`: carries `full_surface` through JSX/helper render transport.
- `packages/cli/src/core/schemas.ts`: validates `full_surface` in config and rejects conflicting `full_surface + wrapper_id` usage.
- `packages/cli/src/deck/runtime.ts`: rejects conflicting addon-authored surface contracts before image generation.
- `packages/cli/src/cli/commands/start.ts`: resolves primitive render options through one helper and preserves `wrapper_id` compatibility unless `full_surface` explicitly opts out.
- `packages/cli/fixtures/phase-17/config.wrapper-compatibility.yml`: committed review fixture for legacy wrapper compatibility vs explicit full-surface rendering.
- `.planning/phases/17-custom-wrapper-primitives-with-addon/17-UAT.md`: manual review path for the wrapper-compatibility slice.

## Decisions made
- Treated `full_surface: true` as mutually exclusive with `wrapper_id` because the two contracts express opposite intents.
- Preserved legacy `wrapper_id` behavior as a compatibility path on the CLI/device seam instead of inventing a new public shape-id layer.

## Deviations
- Fixed several pre-existing import-path breakages in bundled-addon files (`core-buttons/index.ts`, `core-buttons/buttons/toggle.ts`, `deck/runtime.ts`) because the plan's prescribed verification commands could not run until those unrelated path errors were corrected.

## Notes for downstream
- Wave 2 can now build explicit base-shape helpers on top of a stable default-vs-full-surface contract.
- `17-UAT.md` currently contains the wrapper-compatibility review path only; interaction-state limitation notes may need to be appended in Wave 2 if tap/hold chrome remains unobservable on the real surface.
