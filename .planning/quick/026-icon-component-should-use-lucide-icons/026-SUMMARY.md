# Quick Task 026 Summary

**Task:** Icon component should use lucide icons not svg
**Completed:** 2026-06-02

## What was done
Replaced the shared named-icon path in `Icon.tsx` with a `lucide-react` backed mapping instead of the handwritten SVG registry. The public `Icon` API, asset-icon path, and runtime HTML markers stayed intact, while focused regressions now pin the shared icon seam to the library-backed implementation.

## Files changed
- `packages/cli/package.json`: added the `lucide-react` dependency for the shared icon surface.
- `packages/cli/src/ui/Icon.tsx`: replaced the handwritten generic and brand SVG registries with `lucide-react` icon mappings while preserving the existing prop contract and asset-icon branch.
- `packages/cli/src/deck/runtime.test.ts`: tightened runtime helper regressions to prove the rendered generic warning icon now comes from the lucide-backed seam and added a source-level guard against the old handwritten registry.
- `packages/cli/src/cli/commands/start.test.ts`: added a focused source regression that pins the shared `Icon` implementation to `lucide-react` without depending on the currently noisy Phase 23 config seam.

## Commit
`bfc0cc2`
