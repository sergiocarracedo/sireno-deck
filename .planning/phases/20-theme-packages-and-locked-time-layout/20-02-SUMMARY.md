# Plan 20-02 Summary

**Completed:** 2026-05-23

## What was built
Phase 20 now ships one package-root-aware asset pipeline for both theme and addon assets. Theme CSS and bundled font files are injected into the browser host with CSS-relative `url(...)` paths rewritten against the stylesheet file location, while config-authored and addon-authored asset references continue resolving before render time through the shared registry path. The shipped emoji-selector/browser fixture now proves this is a general asset contract, not a one-off widget patch.

## Key files
- `packages/cli/src/addon/registry.ts`: exposes the shared package-root-aware asset registration and required-path lookup seam used across bundled and external addons.
- `packages/cli/src/addon/registry.test.ts`: proves shipped builtin/addon asset refs resolve through the shared registry contract.
- `packages/cli/src/config/theme.ts`: loads manifest-declared theme stylesheet assets, rewrites CSS-relative `url(...)` paths, and fails clearly when bundled assets are missing.
- `packages/cli/src/config/theme.test.ts`: proves broken theme stylesheet asset refs fail loudly and path-aware.
- `packages/cli/src/core/schemas.ts` and `packages/cli/src/config/loader.ts`: keep config-authored asset expansion in the validation/load path instead of deferring raw refs into rendering.
- `packages/cli/src/render/dom-host.tsx` and `packages/cli/src/render/dom-host.test.tsx`: inject the resolved theme stylesheet content into the browser deck document and prove the browser host sees rewritten `file://` asset URLs.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` and `index.test.ts`: consume the shared package-root asset contract as the shipped proof surface.
- `packages/cli/fixtures/phase-20/config.asset-pipeline.yml`: committed browser/device review fixture covering both packaged theme assets and addon-backed browser images.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-UAT.md` and `20-VERIFICATION.md`: add the shared asset-pipeline proof criteria and verification notes for this slice.

## Decisions made
- Kept asset expansion authoritative in the config/load path rather than weakening the contract into late render-time string guessing.
- Used normal CSS `@font-face` plus CSS-relative URL rewriting so theme typography differences come from bundled assets, not host-installed fonts.

## Notes for downstream
- This plan established the shared asset contract, but later manual UAT exposed two additional real-path gaps: browser capture origin (`20-05`) and built-in addon asset registration paths (`20-06`).
- The shipped asset-heavy fixture remained the key proof path for later gap-closure reruns because it exercised both theme-owned and addon-owned assets on the real browser/device seam.
