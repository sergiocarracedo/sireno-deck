# Plan 09-02 Summary

**Completed:** 2026-05-16

## What was built
Phase 9 now includes one focused authoring guide and one verified addon-style example that explain the Sireno custom render contract as explicitly non-DOM. The repo now has a root `README.md` section that points addon authors at `sireno-deck-cli/jsx`, shows the custom elements concretely, keeps the helper-based alternative visible, and anchors that explanation to a typechecked Phase 9 example plus a reconciler parity test so the docs and example stay aligned with the shipped API.

## Key files
- `README.md`: adds the focused non-DOM addon authoring guide and explicit JSX opt-in explanation.
- `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx`: shows JSX-authored and helper-authored custom render elements side by side.
- `packages/cli/fixtures/phase-9/tsconfig.jsx-authoring-example.json`: typechecks the example with an explicit `sireno-deck-cli/jsx` path mapping.
- `packages/cli/src/render/reconciler.test.tsx`: verifies the shipped Phase 9 example keeps helper and JSX output in parity.
- `.planning/phases/09-calendar-authoring-clarity/09-UAT.md`: extends the review path to cover the authoring clarity promise as well as the calendar widget.
- `packages/cli/src/core/schemas.ts`: tightens the generated-deck envelope handoff so the Phase 9 example typecheck does not fail on an unrelated optional-type mismatch.

## Decisions made
- Added the focused authoring guide at the repo root because the plan named `README.md` and the project did not yet have one.
- Kept the example honest by making the explicit JSX path visible through `sireno-deck-cli/jsx`, while importing helper constructors from the live source seam used by the repo today.

## Deviations
- The example's helper import path cannot yet come from the package root export because the source tree does not currently expose a root `src/index.ts` entry that matches `package.json`.

## Notes for downstream
- The root package export for `sireno-deck-cli` still needs a matching source entry if future docs or examples should import helper constructors from the package root instead of a repo-local source path.
