# Plan 20-04 Summary

**Completed:** 2026-05-24

## What was built
Closed the Phase 20 UAT gap where shared addon/config image assets resolved through the package registry but still rendered as broken squares on the shipped browser/device path. Browser-consumed icon refs now normalize into `file://` URLs instead of raw filesystem paths, focused tests pin that browser-loadable contract, and the Phase 20 UAT record now points directly to this closure plan plus the required Fixture 2 rerun.

## Key files
- `packages/cli/src/addon/api.ts`: normalizes DOM image sources so absolute filesystem paths and runtime `addon://` / `builtin://` refs become browser-loadable `file://` URLs.
- `packages/cli/src/core/schemas.ts`: converts config-expanded asset refs into `file://` URLs and wires the DOM asset resolver to the active addon registry.
- `packages/cli/src/render/dom-host.test.tsx`: proves absolute icon paths render as browser-loadable `file://` image sources.
- `packages/cli/src/config/loader.test.ts`: now verifies the shipped asset-pipeline config emits browser-loadable icon refs instead of only checking for filenames.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`: proves shipped emoji entry icons render through resolved browser-loadable asset URLs.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-UAT.md`: links the failed asset-pipeline review gap to `20-04-PLAN.md` and the rerun fixture path.

## Decisions made
- Kept the fix in the shared browser asset seam instead of adding another emoji-selector-specific patch.
- Normalized browser image refs at both config-expanded and runtime-resolved paths so config-authored and addon-authored assets follow one honest browser contract.

## Deviations
- None.

## Notes for downstream
- Rerun Phase 20 Fixture 2 on `packages/cli/fixtures/phase-20/config.asset-pipeline.yml`; that was the only failed UAT surface.
- The shared asset fix now covers both direct absolute paths and unresolved runtime `addon://` / `builtin://` refs on the browser DOM path.
