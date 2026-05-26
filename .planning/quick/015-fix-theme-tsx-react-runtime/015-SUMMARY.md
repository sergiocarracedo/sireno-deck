# Quick Task 015 Summary

**Task:** Fix this: `pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml` crashes with `ReferenceError: React is not defined` from the default theme `ButtonFrame.tsx`.
**Completed:** 2026-05-26

## What was done
Fixed the shipped default theme frame so it no longer relies on an ambient `React` global when the theme runtime is loaded through the Phase 25 `tsx` seam. Added focused built-in theme coverage that actually invokes `resolveTheme('dark').buttonFrame(...)`, which catches this failure mode instead of only asserting the file graph.

## Files changed
- `packages/cli/src/themes/default/ButtonFrame.tsx`: replaced JSX-only output with an explicit `createElement(...)` call so the built-in frame survives `tsImport(..., { tsconfig: false })`.
- `packages/cli/src/config/theme.test.ts`: extended the built-in theme test to invoke the resolved frame and assert the shipped frame marker is emitted.

## Commit
`63fd4d8` `fix(quick-015): remove ambient react theme dependency`
