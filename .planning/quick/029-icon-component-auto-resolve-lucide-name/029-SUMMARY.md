# Quick Task 029 Summary

**Task:** in /works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx the icon component will get a icon name, and it should resolve that name automatically to the lucide icon, dont use a hardcoed map
**Completed:** 2026-06-02

## What was done
Replaced the handwritten generic Lucide registry in `Icon.tsx` with a resolver built from the live `lucide-react` module exports. The resolver now accepts kebab-case, snake_case, and camelCase names, and throws a clear error when the requested icon does not exist.

Cleaned up the two nearby call sites that were still depending on local icon-name assumptions. `system-status` now treats non-asset icon strings as Lucide names directly, and the runtime error surface now uses the real Lucide name `triangle-alert`.

## Files changed
- `.planning/quick/029-icon-component-auto-resolve-lucide-name/029-PLAN.md`: updated the plan metadata to match the final touched files and real Lucide names.
- `packages/cli/src/ui/Icon.tsx`: removed the hardcoded generic icon map and added export-driven Lucide name resolution.
- `packages/cli/src/ui/Icon.test.tsx`: added focused regression coverage for valid and invalid resolved names.
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`: removed the local generic-icon allowlist and delegated name resolution to `Icon`.
- `packages/cli/src/deck/runtime.ts`: switched the runtime error icon from the old local alias to the real Lucide name.

## Verification
- `pnpm --filter sireno-deck-cli exec vitest run src/ui/Icon.test.tsx src/ui/LabelValueList.test.tsx`
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/system-status/index.test.ts src/render/dom-host.test.tsx`

## Commits
- `4d4f086` (`feat(34-03): wire date-time command handlers`) - implementation commit that also carried the quick-task code changes
