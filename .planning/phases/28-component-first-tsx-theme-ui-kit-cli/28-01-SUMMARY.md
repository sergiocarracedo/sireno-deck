# Plan 28-01 Summary

**Completed:** 2026-05-27

## What was built
Established the first honest Phase 28 tracer bullet: a public component-first UI kit at the `sireno-deck-cli` root surface and one real raw-source addon fixture proving it through the live loader/start/runtime seams. The repo now exposes core-owned `Icon`, `Text`, and `Chip` primitives for mounted addon authoring, and the committed Phase 23 fixture exercises that kit through the same raw-source TSX path developers actually use.

This plan also added the runtime-owned theme presentation seam for those primitives. Themes can now optionally present `Icon`, `Chip`, and `Text` alongside `buttonFrame`, while core keeps ownership of `Text` behavior such as `wrap`, `ellipsis`, `shrink`, and marquee overflow rules.

## Key files
- `packages/cli/src/ui/Icon.tsx`, `Text.tsx`, `Chip.tsx`, and `ui/index.ts`: introduced the public component-first addon kit, including one `Icon` API for generic/brand/asset icons, a core-owned `Text` fit contract, and a reusable `Chip` primitive.
- `packages/cli/src/addon/api.ts`, `packages/cli/src/index.ts`, and `packages/cli/tsconfig.json`: fixed the public authoring surface so mounted addon authors can use the kit and `defineMountedButton` through the root export, and raw-source local addons resolve that live source surface truthfully.
- `packages/cli/fixtures/phase-23/local-raw-addon/src/content.tsx`, `src/index.tsx`, and `packages/cli/fixtures/phase-23/README.md`: migrated the committed Phase 23 raw-source addon fixture onto `ButtonSurface`, `Chip`, `Icon`, and `Text` as the first real end-to-end proof.
- `packages/cli/src/config/theme.ts`, `packages/cli/src/themes/default/index.ts`, `packages/cli/src/themes/default/ButtonFrame.tsx`, `packages/cli/src/themes/default/theme.css`, and `packages/cli/src/ui/theme-presentation.tsx`: added the typed presentation-only theme seam for `Icon` / `Chip` / `Text` and proved it through the shipped default theme.
- `packages/cli/src/addon/loader.ts`, `packages/cli/src/addon/loader.test.ts`, `packages/cli/src/config/theme.test.ts`, `packages/cli/src/render/dom-host.tsx`, `packages/cli/src/render/dom-host-button.tsx`, `packages/cli/src/render/dom-host.test.tsx`, and `packages/cli/src/cli/commands/start.test.ts`: closed the raw-source TSX/runtime gaps and locked the first truthful regression coverage for both the public kit and the theme presentation seam.

## Decisions made
- Kept the first slice narrow and honest: one real committed addon fixture had to use the new kit immediately, rather than landing kit exports with no runtime consumer.
- Preserved `Text` behavior in core and gave themes only a presentation bridge, because letting themes own marquee/overflow rules would recreate the same drift Phase 28 was trying to remove.
- Fixed raw-source addon loading with a local tsconfig/runtime-policy anchor instead of falling back to ambient React imports or copying addon source into a temp snapshot that would break legal relative imports.

## Notes for downstream
- `28-01` proved the component-first surface and the theme presentation seam, but helper-built shipped buttons/runtime fallback UI still remained at that point; `28-02` was the first slice that moved the main built-in/runtime path onto the new kit.
- The public authoring seam now assumes root-imported `defineMountedButton`, `ButtonSurface`, `Icon`, `Chip`, and `Text`. Later docs/examples should stay on that exact contract.
