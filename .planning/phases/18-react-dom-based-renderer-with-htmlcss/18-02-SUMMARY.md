# Plan 18-02 Summary

**Completed:** 2026-05-21
**Phase:** 18 — React DOM-Based Renderer With HTML/CSS Surface Support

## What was built
Wave 2 stopped pretending the old SVG-era reconciler contract was still the main authoring surface. The config loader now keeps addon-owned visual payload under `button.config`, the fallback reconciler helper is explicitly marked legacy-only, and the tests now verify the DOM contract as the shipped center instead of the old top-level shadow fields.

Bundled date/time buttons also moved onto the DOM render path. Digital date/time, analog clock, and calendar sheet buttons now emit DOM content wrapped by the shared `buttonFrame` by default, and the phase now has a broader fixture showing framed DOM builtins beside an explicit `full_surface` opt-out.

## Key files
- `packages/cli/src/core/schemas.ts`: removes top-level shadow copies of addon-owned payload fields from `ButtonInstance`
- `packages/cli/src/config/loader.test.ts`: updates loader expectations so addon-owned render payload stays under `config`
- `packages/cli/src/render/reconciler.ts`: renames the old helper to `createLegacyDisplayButtonModels` and scopes it to the fallback path
- `packages/cli/src/render/types.ts`: marks the old reconciler types as legacy compatibility-only
- `packages/cli/src/builtin-addons/date-time/index.ts`: migrates digital date/time, analog clock, and calendar sheet buttons to DOM-authored renders
- `packages/cli/fixtures/phase-18/config.dom-frame-defaults.yml`: broader DOM fixture showing default `buttonFrame` behavior and a `full_surface` contrast case

## Decisions made
- Kept the old reconciler/types seam only as a narrow fallback contract instead of ripping it out while mixed deck fallback still exists.
- Treated addon-owned button payload as config-owned data only; runtime and loader tests now assert through `button.config` rather than top-level mirror fields.
- Migrated the bundled date/time addon to DOM content with simple deterministic HTML/CSS visuals so the browser-backed path now covers more than action/change-deck.

## Deviations from plan
- Updated `packages/cli/src/deck/runtime.test.ts` alongside the builtin migration because Phase 11 fixture expectations were still asserting legacy text descriptions for buttons that now render DOM content.

## Notes for downstream
- Wave 3 can now focus on live DOM updates and deck-level coalescing without the date/time addon blocking broader DOM coverage.
- The legacy SVG fallback still exists for mixed or unmigrated decks, so downstream work should keep distinguishing fallback compatibility from the shipped DOM-first authoring path.
