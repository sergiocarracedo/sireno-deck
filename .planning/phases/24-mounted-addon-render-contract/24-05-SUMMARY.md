# Plan 24-05 Summary

**Completed:** 2026-05-26

## What was built
Closed the first Phase 24 UAT gap at the real seam: the HTTP-served emulator page now gets browser-loadable asset URLs instead of inheriting `file://...` image paths that only worked on the Playwright capture path. The mounted contract in `packages/cli/src/addon/api.ts` now accepts root-relative/browser-safe asset URLs from the resolver, and the emulator server in `packages/cli/src/cli/commands/start.ts` serves addon/theme assets through an explicit `GET /__sireno/assets?ref=...` endpoint.

This kept the fix narrow and honest. Hardware and screenshot capture still use the filesystem-backed asset path they already relied on, while the user-facing emulator now rewrites built-in icon references like the emoji-selector assets onto an HTTP path a real browser page can load.

## Key files
- `packages/cli/src/addon/api.ts`: accepts root-relative or otherwise browser-safe resolved asset URLs without forcing them back through `file://` conversion.
- `packages/cli/src/cli/commands/start.ts`: serves addon/theme assets through the emulator HTTP process and installs an emulator-specific DOM asset resolver.
- `packages/cli/src/cli/commands/start.test.ts`: pins the built-in icon path on the real emulator HTML seam.

## Decisions made
- Kept the asset fix emulator-only instead of redesigning the shared addon asset registry.
- Preserved the browser-renderer capture path exactly as-is so hardware and screenshot rendering still load disk-backed assets through the existing mechanism.
- Tightened the regression onto the real `createDomIcon(...)` seam after the first test draft incorrectly bypassed addon asset resolution.

## Notes for downstream
- `start.test.ts` still contains an unrelated dirty Phase 23 fixture failure in the user worktree; focused emulator-pattern verification was used for this slice to avoid conflating that unrelated issue with the asset fix.
- The Phase 24 UAT image gap still needs a human rerun, but the closure path is now committed and regression-pinned.
