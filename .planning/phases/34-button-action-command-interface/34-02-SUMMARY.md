# Plan 34-02 Summary

**Completed:** 2026-06-02

## What was built
System-status now uses the shared nested `commands` contract instead of addon-local `tap_command` and `hold_command` fields. Both bundled system-status button definitions now compose `useButtonActionCommand(...)`, which removes their duplicated 600ms hold-timer bookkeeping while preserving payload polling, unavailable rendering, and addon-owned cadence behavior.

The bundled addon regression tests now prove the migrated schema shape, shared tap/hold behavior, and double-tap suppression through the real system-status addon seam. During verification, an unrelated pre-existing break in `packages/cli/src/ui/Icon.tsx` (`LucideComponent is not defined`) blocked the registry-path test, so that prerequisite was fixed separately before rerunning the plan verification.

## Key files
- `packages/cli/src/builtin-addons/system-status/schemas.ts`: hard-cuts bars and label-values onto the shared optional nested `commands` schema.
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx`: replaces bespoke hold/tap timer logic with `useButtonActionCommand(...)` while keeping metrics polling/rendering intact.
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`: removes duplicated command bookkeeping and composes the shared hook without changing display behavior.
- `packages/cli/src/builtin-addons/system-status/index.test.ts`: locks the migrated schema and shared tap/hold/double-tap behavior through the bundled addon seam.
- `packages/cli/src/ui/Icon.tsx`: restores Lucide icon rendering so the unrelated registry-path regression stops blocking addon verification.

## Verification
- `grep -n "tap_command\|hold_command\|commands" packages/cli/src/builtin-addons/system-status/schemas.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx -t "Icon|clock"`
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/system-status/index.test.ts -t "system-status|tap|hold|double|command|unavailable"`

## Commits
- `7f82592` `feat(34-02): migrate system-status command schema`
- `58b456f` `fix(icon): restore lucide component rendering`
- `037e036` `feat(34-02): share system-status command handling`

## Notes
- Command execution still flows through `methods.runCommand(...)`; no new executor seam was introduced.
- No automatic invalidation was added to the shared command hook.
- Gesture policy remains addon-side; `deck/runtime.ts` was left untouched.
