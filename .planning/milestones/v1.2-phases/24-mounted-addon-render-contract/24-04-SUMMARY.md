# Plan 24-04 Summary

**Completed:** 2026-05-26

## What was built
Finished the phase honestly by making the repo's shipped examples and docs match the mounted contract that now exists in code. All shipped built-in addon definitions were migrated to `defineMountedButton(...)` as the primary authoring model, the Phase 24 fixture/test surface was extended to prove the mounted active-deck/store/runtime boundary on a committed file-backed path, and the architecture docs no longer claim the runtime is intentionally static or non-DOM.

The risky part of this slice was compatibility, especially for the bundled toggle button and the in-flight `date-time` refactor already present in the worktree. The migration stayed surgical: stateless built-ins moved directly to mounted definitions, while `toggle` regained old behavior through a fallback mounted-store path plus instance-sensitive `defaultIntervalMs` support so existing `createInstance(...)`-driven tests and runtime polling semantics stayed truthful.

## Key files
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.ts`: migrated action button authoring to the mounted contract.
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.ts`: migrated deck-navigation button authoring to the mounted contract.
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.ts`: migrated the sampled-media example to the mounted contract.
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts`: preserved internal/get-set/toggle-status behavior through mounted store state and mode-sensitive cadence.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`: migrated shipped emoji buttons to the mounted contract.
- `packages/cli/src/builtin-addons/date-time/index.ts` and `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`: integrated the mounted migration cautiously with the existing user-side extraction work.
- `packages/cli/src/addon/api.ts`: added fallback mounted-store support and dynamic instance-level `defaultIntervalMs` handling for compatibility.
- `.planning/codebase/ARCHITECTURE.md` and `AGENTS.md`: updated architecture/status docs to match the shipped mounted runtime.

## Decisions made
- Preserved and integrated with the user's in-flight `date-time` extraction rather than reverting it.
- Fixed adapter compatibility gaps instead of weakening built-in tests; the old tests remain the truth surface for behavior preservation.
- Split the Wave 3 closeout into one proof-fixture/test commit and one doc-truthfulness commit so the workflow artifacts stay honest and reviewable.

## Notes for downstream
- `grep createInstance packages/cli/src/builtin-addons` should now only hit tests or intentional compatibility code; shipped source definitions teach the mounted contract by example.
- The Phase 24 fixture now exercises addon-store coordination, mounted local state, and transient runtime props together through file-relative test paths.
