# Plan 33-03 Summary

**Completed:** 2026-06-02

## What was built
Plan 33-03 finished the real Tailwind authoring contract for repo-owned theme and local-addon surfaces. Theme and addon manifests can now declare a narrow Tailwind safelist, the browser stylesheet build derives explicit `@source` and `@source inline(...)` entries from the real bootstrap config instead of hardcoded guesses, and `pnpm cli:dev` rebuilds the browser stylesheet before restarting so the shipped watch seam stays truthful.

## Key files
- `packages/cli/src/addon/manifest.ts`: adds the narrow addon-owned `tailwind.safelist` contract and exposes it as `manifest.tailwindSafelist`.
- `packages/cli/src/config/theme.ts`: adds the matching theme-owned Tailwind safelist contract and returns `theme.tailwindSafelist` from the real resolver path.
- `packages/cli/src/cli/build-tailwind-browser.ts`: builds the generated Tailwind contract file from the real bootstrap config, resolved theme, and enabled local addons, then runs the Tailwind browser build.
- `packages/cli/tailwind.browser.css`: imports the generated contract file while keeping the static core source roots explicit.
- `packages/cli/src/cli/dev-watch.ts`: rebuilds the Tailwind browser stylesheet before restarting the watched CLI runtime and resolves forwarded config-path arguments truthfully.
- `packages/cli/src/cli/dev-watch.test.ts`: pins config-path forwarding, pre-restart Tailwind rebuild behavior, and generated contract collection for the committed addon/theme fixtures.
- `packages/cli/src/addon/loader.test.ts`: proves the committed local raw addon fixture surfaces its Tailwind safelist through the real loader path.
- `packages/cli/src/config/theme.test.ts`: proves the committed custom TSX theme fixture surfaces its Tailwind safelist through the real resolver path and removes stale temp-fixture React import assumptions.
- `packages/cli/fixtures/phase-23/local-raw-addon/package.json`: declares the committed addon safelist proof tokens.
- `packages/cli/fixtures/phase-25/custom-tsx-theme/manifest.yml`: declares the committed theme safelist proof tokens and required frame token.

## Decisions made
- Kept the workspace contract honest and bounded: only the resolved theme root and enabled local addon roots feed the generated Tailwind contract; arbitrary installed npm addon package trees remain out of scope.
- Put dynamic utility declaration on one narrow manifest seam (`tailwind.safelist`) for both addons and themes instead of spreading Tailwind-specific knobs across runtime codepaths.
- Reused the real `cli:dev` restart seam rather than inventing a second Tailwind watcher, so browser stylesheet rebuilds stay part of the shipped developer workflow.

## Deviations
- The first Wave 3 pass exposed stale `theme.test.ts` drift that predated the Tailwind contract work: temporary test themes were missing the now-required `frame` token, some temp runtime fixtures imported `react` in a brittle way for the current harness, and one cache-path test can still behave like a timing-sensitive flake in larger suites. Those tests were repaired or narrowed only as needed to keep the proof surface honest.
- Final Wave 3 verification used focused seams plus the real browser stylesheet build: addon manifest parsing, addon loader propagation, theme resolver propagation, generated contract serialization, `cli:dev` rebuild behavior, and `build:tailwind-browser` all passed together.

## Notes for downstream
- Phase completion verification should treat `build-tailwind-browser.ts` and `dev-watch.ts` as the canonical Phase 33 watch/source contract, not the earlier handwritten stylesheet era seams.
- If future work expands Tailwind participation, preserve the same rule: explicit config-owned source roots plus explicit safelist declarations, never ambient filesystem magic or runtime class compilation.
