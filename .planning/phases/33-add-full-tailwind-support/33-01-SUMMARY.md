# Plan 33-01 Summary

**Completed:** 2026-06-02

## What was built
Plan 33-01 landed the real Tailwind browser asset seam for the browser-rendered deck and split runtime delivery so Tailwind utilities and Sireno-owned runtime glue are injected as separate stylesheet contracts. The CLI package now builds a real `tailwind.browser.generated.css`, `theme-utilities.ts` no longer owns the generic utility surface, and the browser/emulator render path patches the new Tailwind/runtime split truthfully.

## Key files
- `package.json`: adds a repo-owned `cli:build:tailwind-browser` entrypoint for the browser stylesheet build seam.
- `packages/cli/package.json`: adds real Tailwind dependencies and makes the package build generate the browser stylesheet before `tsdown`.
- `packages/cli/tailwind.browser.css`: defines the Tailwind v4 browser entry stylesheet plus Sireno-token-backed custom utilities needed by the current TSX authoring surface.
- `packages/cli/tailwind.browser.generated.css`: generated canonical Tailwind utility asset for browser-rendered decks.
- `packages/cli/src/render/theme-utilities.ts`: keeps resolved `--sireno-*` theme vars and product-only runtime glue while loading Tailwind utilities from the generated CSS asset.
- `packages/cli/src/render/dom-host.tsx`: threads separate Tailwind and Sireno runtime stylesheets into the browser document seam.
- `packages/cli/src/render/dom-host-deck-document.tsx`: injects `data-sireno-tailwind`, `data-sireno-runtime`, and `data-sireno-theme-assets` as explicit split style contracts.
- `packages/cli/src/cli/commands/start.ts`: updates the emulator DOM patch path so it refreshes all three split style tags.
- `packages/cli/src/render/dom-host.test.tsx`: re-pins browser document assertions to the new split contract without depending on the old minified handwritten CSS string shape.
- `packages/cli/src/cli/commands/start.test.ts`: proves the emulator-served deck HTML exposes the split Tailwind/runtime style contract.

## Decisions made
- Kept the runtime cut minimal by preserving `getThemeUtilityStylesheet()` only as a temporary compatibility concat seam during Wave 1, while making Tailwind the real generic utility source underneath.
- Implemented repo-specific token utilities in `tailwind.browser.css` so existing shipped TSX authoring stays green before the broader hard-cut migration in Wave 2.
- Split browser delivery into explicit Tailwind and Sireno runtime style tags instead of overloading the legacy `data-sireno-theme-utilities` seam.

## Deviations
- The plan's full verify command (`vitest run src/render/dom-host.test.tsx src/cli/commands/start.test.ts`) still hits four pre-existing unrelated failures in the repo: two existing `dom-host` timeout tests and two existing Phase 23 sample-config `variant` validation failures. Task-relevant verification was therefore narrowed to the two seams changed by this plan: `dom-host.test.tsx -t "exports theme CSS vars plus split Tailwind/runtime stylesheets on the deck root"` and `start.test.ts -t "serves theme styles and browser-loadable font urls on the emulator path"`, both of which passed.

## Notes for downstream
- Wave 2 can now migrate shared UI and built-ins onto canonical Tailwind classes without depending on the old handwritten utility generator.
- Wave 3 should keep using the new split delivery contract (`data-sireno-tailwind`, `data-sireno-runtime`, `data-sireno-theme-assets`) when wiring watch/safelist/theme-addon scan behavior.
