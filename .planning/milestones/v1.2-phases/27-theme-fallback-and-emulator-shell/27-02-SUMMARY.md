# Plan 27-02 Summary

**Completed:** 2026-05-27

## What was built
Kept one shared browser deck renderer while moving emulator-specific chrome behind an explicit render intent. `packages/cli/src/render/dom-host.tsx` now accepts `emulatorMode`, so the same `renderDomDeck(...)` seam can render flat browser-capture output by default and only add glass shell background, key-well gradients, rounded corners, and highlight overlays when the HTML is headed to the emulator.

This slice also fixed the real TSX runtime policy at the source instead of reintroducing manual React-import boilerplate. The raw theme and addon loaders now pass the package `tsconfig.json` into `tsx/esm/api`, and the runtime regression proof moved onto `node --import tsx/esm --eval` after verifying the `tsx` CLI wrapper itself hangs under `execa` for this seam. The earlier emulator stale-warning review fix was folded into the same committed shell path so deck-root patching now reconciles the full direct-child list, not only keyed button nodes.

## Key files
- `packages/cli/src/render/dom-host.tsx`: added `emulatorMode?: boolean` to `DomHostRenderOptions` and gated deck shell chrome to emulator-only rendering while preserving one shared document/render seam.
- `packages/cli/src/cli/commands/start.ts`: threaded `emulatorMode` through `createDeckHtml(...)`, kept browser capture on `false`, set emulator mismatch/runtime HTML paths to `true`, and committed the direct-child deck-root patcher fix so stale inline warnings do not persist.
- `packages/cli/src/config/theme.ts`: switched raw theme runtime imports from `tsconfig: false` to the package `tsconfig.json` path.
- `packages/cli/src/addon/loader.ts`: did the same for raw addon runtime imports so both runtime authoring seams use one honest TSX policy.
- `packages/cli/src/cli/commands/start.test.ts`: replaced the flaky `pnpm exec tsx` subprocess proof with `node --import tsx/esm --eval`, asserted `emulatorMode` threading, and kept the emulator patcher source-level guardrails.
- `packages/cli/src/render/dom-host.test.tsx`: added focused coverage proving shell chrome stays off by default and only appears when `emulatorMode` is explicit.

## Decisions made
- Preserved one shared `renderDomDeck(...)` path and threaded emulator intent through options instead of forking a second browser/emulator renderer.
- Fixed the real TSX runtime policy in the raw loader seams rather than re-adding `import React from 'react'` in touched runtime modules.
- Kept the runtime regression on a real TypeScript execution path, but swapped from the flaky `tsx` CLI wrapper to `node --import tsx/esm` after reproducing the wrapper hang outside the product code.

## Notes for downstream
- Browser-capture HTML is now intentionally flatter than emulator HTML. If future visual work expects shell chrome everywhere, that is a product-scope change, not an accidental renderer regression.
- The honest runtime proof is the `node --import tsx/esm` subprocess seam plus the raw loader `PACKAGE_TSCONFIG_PATH` wiring. If that proof breaks later, debug the runtime policy before papering it over with ambient React imports.
