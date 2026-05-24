# Plan 20-06 Summary

**Completed:** 2026-05-24

## What was built
Closed the remaining automated Phase 20 asset-registration gap by correcting the built-in addon asset declarations to resolve from each addon's own `assets/` directory instead of the parent `builtin-addons/` folder. Focused resolver coverage now asserts the actual resolved filesystem path shape for shipped builtin/addon asset refs before those paths are converted into browser `file://` URLs, and the Phase 20 UAT/verification artifacts now point Fixture 2 at this corrected closure path.

## Key files
- `packages/cli/src/builtin-addons/core-buttons/index.ts`: now registers `clock.svg` from the addon-local `./assets/` directory.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts`: now registers all shipped emoji/category assets from the addon-local `./assets/` directory.
- `packages/cli/src/addon/registry.test.ts`: proves the registry preserves addon-local `assets/` directory segments when registering shipped assets.
- `packages/cli/src/config/loader.test.ts`: proves bundled emoji-selector config expansion resolves to addon-local asset paths before browser rendering begins.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-UAT.md`: now points Fixture 2 at `20-06-PLAN.md` and preserves the failed `20-05` evidence.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-VERIFICATION.md`: records the new path-registration proof and leaves the final browser/device rerun explicit.

## Decisions made
- Kept the fix at the real shared source by correcting the built-in asset declarations rather than layering more browser-side workarounds on top of bad registered paths.
- Strengthened tests to assert resolved filesystem paths, because filename-only or `file://`-only checks were too weak to catch a missing addon folder segment.

## Deviations
- None.

## Notes for downstream
- Manual UAT still needs to rerun `packages/cli/fixtures/phase-20/config.asset-pipeline.yml` on the shipped browser/device path and record whether Fixture 2 now passes.
- If that rerun still fails, the next gap is no longer asset declaration or browser capture origin; it would need fresh diagnosis from the real shipped path.
