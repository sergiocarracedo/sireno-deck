---
wave: 3
status: completed
---

# 18-03 Summary

## Completed

- Rebased `packages/cli/src/deck/runtime.test.ts` onto the browser-only DOM content contract.
- Kept runtime-owned surfaces in `packages/cli/src/deck/runtime.ts` while making reload-error rendering emit real DOM detail lines through the browser path.
- Updated `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts` so live toggle state remains visible on the DOM/browser renderer.
- Preserved live bundled date/time behavior under the browser-only runtime path.
- Added `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml` for stateful toggle and live date/time review on-device.

## Verification

- `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/cli/commands/start.test.ts src/builtin-addons/core-buttons/index.test.ts src/builtin-addons/date-time/index.test.ts`

## Learnings

- Cutting the legacy descriptive render payload means tests must assert browser-owned DOM content, not old synthetic metadata fields like toggle subtitles or error detail arrays.
- The runtime-owned reload-error surface needed its own DOM composition path; flattening it to a single text label silently dropped the useful diagnostics.
