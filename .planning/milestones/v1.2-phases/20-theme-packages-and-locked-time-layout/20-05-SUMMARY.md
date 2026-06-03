# Plan 20-05 Summary

**Completed:** 2026-05-24

## What was built
Closed the remaining automated Phase 20 asset gap at the real browser-renderer seam instead of the static HTML seam. The browser renderer now writes each deck document to a temporary file-backed page before Playwright capture, which gives shared `file://` addon/config image assets the same browser origin model as the shipped device path, and focused tests now pin that contract directly in `browser-renderer.test.ts`.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: moves the screenshot seam from `page.setContent(...)` on an originless document to a temporary file-backed browser page, then cleans that capture document up on shutdown.
- `packages/cli/src/render/browser-renderer.test.ts`: proves the real capture seam loads a local image asset through the browser-renderer path instead of only asserting static HTML output.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-UAT.md`: points Fixture 2 at `20-05-PLAN.md` and records why `20-04` was insufficient.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-VERIFICATION.md`: records the new browser-renderer seam proof and leaves the remaining manual rerun explicit.

## Decisions made
- Kept the fix inside the shared browser capture seam rather than adding widget-specific asset handling.
- Treated the real browser origin as the root cause: `page.setContent(...)` was not equivalent to loading the deck HTML as a `file://` page for local asset rendering.

## Deviations
- None.

## Notes for downstream
- Manual UAT still needs to rerun `packages/cli/fixtures/phase-20/config.asset-pipeline.yml` on the shipped browser/device path and record whether Fixture 2 now passes.
- If that rerun passes, Phase 20 can move back toward completion artifacts; if it fails, the next gap is no longer the HTML/URL seam and should be diagnosed from the real device/browser path again.
