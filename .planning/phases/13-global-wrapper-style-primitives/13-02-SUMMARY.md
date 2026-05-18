# Plan 13-02 Summary

**Completed:** 2026-05-18

## What was built
Phase 13 now carries `wrapper_id` and `style_id` through the public render contract, validates addon-authored primitive references before image generation, and applies primitive-backed defaults on the shared/default renderer path without overriding explicit Phase 12 props like `background` and `fit`. The repo also ships a committed Phase 13 review fixture and UAT guide showing bundled primitive styling and explicit-prop precedence on the real shared/default path.

## Key files
- `packages/cli/src/render/types.ts`: adds direct primitive ids to `deck-button` and `deck-surface` button props.
- `packages/cli/src/render/reconciler.ts`: preserves primitive ids through helper-authored and JSX-authored render descriptions.
- `packages/cli/src/deck/runtime.ts`: validates addon-authored primitive refs before pixels are generated and reports async render errors explicitly.
- `packages/cli/src/cli/commands/start.ts`: resolves primitive ids through the live registry into minimal shared/default render options.
- `packages/cli/src/render/text-image.ts`: consumes primitive-backed shared accent styling on the shared/default branch while keeping explicit props authoritative.
- `packages/cli/fixtures/phase-13/config.wrapper-style-primitives.yml`: committed review fixture for bundled primitive styling and explicit background precedence.

## Decisions made
- Kept primitive-definition lookup at the runtime/device boundary instead of teaching `text-image.ts` about the registry.
- Used the bundled `core-buttons/accent` style plus `core-buttons/shared-card` wrapper as the first shipped primitive review path.
- Preserved explicit `background` and `fit` behavior over primitive defaults rather than making primitives an exclusive styling mode.
- Added explicit async runtime error reporting because primitive validation at render time otherwise leaked as unhandled promise rejections.

## Notes for downstream
- The first rollout only covers `deck-button` and `deck-surface` button collections, as planned.
- Primitive-backed styling currently affects the shared/default path only; bespoke variants remain outside the abstraction.
- Human UAT is still needed to visually confirm the bundled primitive review path on a real rendered surface.
