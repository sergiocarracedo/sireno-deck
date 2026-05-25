# Plan 23-01 Summary

**Completed:** 2026-05-25

## What was built
Added a narrow local raw-source addon loading path that lets `sirenoAddon.main` point at local `.ts`, `.tsx`, or `.jsx` source without a separate prebuild step. The loader now uses `tsx` programmatic import support only for local transpiled source entries, keeps existing built-JS and npm addon loading on the old dynamic-import path, and preflights the local source graph so imports cannot escape the addon root.

The plan also ships a committed Phase 23 raw `.tsx` addon fixture plus tests proving both the loader seam and the normal startup config path can load that fixture through root-package exports only. During execution, startup-path tests exposed a stale expectation around browser-renderer boot failure, so the test contract was corrected to match the live `startDaemon()` behavior: unknown renderer-start failures reject honestly.

## Key files
- `packages/cli/src/addon/loader.ts`: added the local raw-source branch, `tsx`-backed import path, and bounded source-graph validation for local addon source.
- `packages/cli/src/addon/loader.test.ts`: added committed fixture coverage for local raw `.tsx` addons plus an out-of-root import rejection case.
- `packages/cli/src/cli/commands/start.test.ts`: added startup-path coverage proving `loadRuntimeConfig()` can load the raw-source fixture through the normal CLI config path and tightened shared mock isolation.
- `packages/cli/fixtures/phase-23/local-raw-addon/package.json`: committed a manifest-driven local raw addon fixture pointing at `./src/index.tsx`.
- `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx`: fixture addon entry using only root `sireno-deck-cli` exports and a sibling relative import.
- `packages/cli/fixtures/phase-23/local-raw-addon/src/content.tsx`: sibling fixture module returning base-shape text content through the public root export surface.

## Decisions made
- Used `tsx/esm/api` programmatic import support for local raw source instead of Node native TypeScript execution or a custom snapshot transpiler.
- Kept the raw-source branch local-only and transpile-only: built `.js` entries and npm addons still use the existing dynamic `import()` path.
- Reused the theme runtime graph boundary as the loader policy model: manifest-driven entry, relative-or-explicit filesystem imports only, and no tsconfig alias/project behavior.
- Updated the stale browser-renderer failure assertion in `start.test.ts` because the real code already rethrows unknown startup failures; the test, not the runtime, was wrong.

## Notes for downstream
- Plan `23-02` can assume the normal CLI startup path already accepts local raw `.tsx` addons and that the startup test file now has stronger shared-mock resets.
- The public addon authoring surface remains the package root export only; nothing in this plan restores `./jsx` as public API.
