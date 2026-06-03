# Plan 16-04 Summary

**Completed:** 2026-05-19

## What was built
Shared-wrapper visuals are now cleaner and more controllable without widening the renderer into a styling system. The shared/default wrapper no longer renders the theme-name footer, and buttons can opt into one explicit per-button `accent` override using either theme tokens or raw hex colors while existing wrapper/style primitives and explicit props remain authoritative.

## Key files
- `packages/cli/src/core/schemas.ts`: validates the narrow button-level `accent` field as either a supported theme token or hex color.
- `packages/cli/src/render/types.ts`: adds `accent` to the public render contract.
- `packages/cli/src/render/reconciler.ts`: preserves `accent` through render descriptions and helper-generated button models.
- `packages/cli/src/render/text-image.ts`: removes the footer and resolves shared-wrapper accent overrides on the shared/default path only.
- `packages/cli/src/render/text-image.test.ts`: proves footer removal and token/raw accent overrides are visually observable.

## Decisions made
- Kept the new control as one explicit `accent` field instead of introducing a nested style object or broader theming language.
- Limited the override to the shared/default path so bespoke variants keep their existing visual contracts.

## Deviations
- None.

## Notes for downstream
- Existing primitive-backed shared styling still works; the button-level accent override is an additional explicit knob, not a replacement for wrapper/style primitives.
- Footer removal is total, not just hidden behind a default or theme setting.
