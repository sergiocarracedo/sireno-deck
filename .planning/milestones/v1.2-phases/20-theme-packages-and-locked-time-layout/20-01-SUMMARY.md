# Plan 20-01 Summary

**Completed:** 2026-05-23

## What was built
Phase 20 now resolves themes through manifest-backed packages instead of only single-file YAML themes, while preserving the existing built-in ids such as `dark` and `light`. Browser-rendered non-`full_surface` buttons now render through the resolved theme-owned `buttonFrame` runtime seam, so frame chrome and typography can vary by theme package without giving theme code ownership of button slot layout or the `full_surface` escape hatch.

## Key files
- `packages/cli/src/config/theme.ts`: resolves built-in and filesystem-backed theme packages, validates `manifest.yml`, loads the runtime entry, and returns the combined theme object used by startup and browser rendering.
- `packages/cli/src/config/theme.test.ts`: proves built-in package lookup, local-path package lookup, and path-aware missing-theme diagnostics.
- `packages/cli/src/cli/commands/start.ts`: consumes the resolved theme object on the shipped runtime path.
- `packages/cli/src/render/dom-host.tsx`: replaces the hardcoded core frame path with the resolved theme runtime `buttonFrame` seam while preserving host layout ownership.
- `packages/cli/src/render/button-frame.tsx`: remains the fallback/default frame implementation shape for compatibility and direct test coverage.
- `themes/default/manifest.yml` and `themes/default/index.js`: convert the shipped dark/default theme onto the package-backed runtime contract.
- `themes/light/manifest.yml` and `themes/light/index.js`: add a visibly distinct built-in light package theme on the same contract.
- `packages/cli/fixtures/phase-20/config.theme-package-frame.yml`: committed browser/device review fixture for the theme-owned frame chrome path.
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-UAT.md`: adds the first Phase 20 review criteria for manifest-backed themes and the `buttonFrame` seam.

## Decisions made
- Kept the browser host authoritative over slot sizing and the `full_surface` bypass, and passed only a narrow `children + idle|tap|hold` contract into theme-owned frame code.
- Preserved `packages/cli/src/render/button-frame.tsx` as the fallback/default implementation instead of deleting the old frame seam outright during the migration.

## Notes for downstream
- The package-backed theme contract became the foundation for the shared asset-pipeline work in `20-02`, where theme CSS and font assets needed the same package-root semantics as addon assets.
- Manual review of `config.theme-package-frame.yml` remained necessary to prove that switching from `theme: dark` to `theme: light` visibly changed browser/device chrome on the shipped path.
