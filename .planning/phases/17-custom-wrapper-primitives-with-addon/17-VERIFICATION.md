---
phase: 17
status: verified
verified: 2026-05-21
---

# Phase 17: Custom Wrapper Primitives + Addon-Authored Rendering Variants — Verification

## Must-Have Results

| Plan  | Must-Have                                                                                                                                                                                                                  | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 17-01 | Public contract distinguishes default base-shape rendering from explicit `full_surface` rendering without public `shape_id` indirection (`src/addon/api.ts`, `src/render/types.ts`, `src/render/reconciler.ts`)                      | ✓      |
| 17-01 | Legacy config-authored `wrapper_id` remains accepted and maps to the default base-shape path (`src/core/schemas.ts`, `src/cli/commands/start.ts`, fixture)                                                                       | ✓      |
| 17-01 | New config-authored `full_surface` field validates early with path-aware diagnostics (`src/core/schemas.ts`, `src/config/loader.test.ts`)                                                                                        | ✓      |
| 17-01 | Invalid addon-authored surface contracts fail before image generation (`src/deck/runtime.ts`, `src/deck/runtime.test.ts`)                                                                                                      | ✓      |
| 17-01 | Shipped CLI/device render path still treats valid legacy `wrapper_id` as the default base-shape contract (`src/cli/commands/start.ts`, `src/cli/commands/start.test.ts`)                                                         | ✓      |
| 17-02 | Shared/default chrome in `text-image.ts` is now an explicit base-shape seam (`buildBaseShapeContent()`, `buildBaseShapeSvg()`)                                                                                                   | ✓      |
| 17-02 | Core exports exactly the first two approved helpers: `createBaseShapeIconLabelContent()` and `createBaseShapeTextContent()` (`src/addon/api.ts`)                                                                                 | ✓      |
| 17-02 | Bundled low-risk text-oriented buttons use the explicit helper path (`core-buttons/buttons/action.ts`, `change-deck.ts`)                                                                                                       | ✓      |
| 17-02 | Bespoke variants remain on their existing seams (`toggle`, `metric`, `media`, `fan`, `emoji`, `analog-clock`, `calendar-sheet`, `error`)                                                                                                   | ✓      |
| 17-02 | First-rollout interaction-state limitation is pinned explicitly in UAT rather than implied                                                                                                                                 | ✓      |
| 17-03 | Explicit `full_surface` escape hatch is observable and test-covered, and missing shape config still falls back to the default base shape (`src/render/text-image.ts`, `src/render/text-image.test.ts`, `src/deck/runtime.test.ts`) | ✓      |
| 17-03 | Default base-shape path and explicit full-surface path are both documented in committed review/UAT artifacts (`config.button-shape-composition.yml`, `17-UAT.md`)                                                            | ✓      |
| 17-03 | Bespoke/custom visuals still bypass the base shape on their existing seams                                                                                                                                                 | ✓      |
| 17-03 | Planned review fixture `packages/cli/fixtures/phase-17/config.button-shape-composition.yml` exists and contains both rendering paths                                                                                         | ✓      |
| 17-04 | Live CLI/device render path forwards `full_surface` into `renderTextImage()` instead of dropping it before image generation (`src/cli/commands/start.ts`, `src/cli/commands/start.test.ts`)                               | ✓      |
| 17-04 | Shipped Phase 17 review fixture reaches the full-surface escape hatch on the real path, and the rerun-backed UAT now proves the visible difference on-device (`config.button-shape-composition.yml`, `17-UAT.md`)                | ✓      |
| 17-04 | Focused start-path coverage proves explicit `full_surface` suppresses wrapper compatibility without depending only on renderer-unit tests (`src/cli/commands/start.test.ts`)                                                   | ✓      |

## Requirement Coverage

| Req ID | Deliverable                                                                                                                                                                                                                                                               | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| N/A    | Phase 17 is post-roadmap scope; no `REQUIREMENTS.md` IDs are assigned to this phase. Roadmap success criteria are traceable to `src/addon/api.ts`, `src/render/text-image.ts`, `src/cli/commands/start.ts`, `src/deck/runtime.ts`, `config.button-shape-composition.yml`, and `17-UAT.md`. | ✓      |

## Integration Checks

| Import                                                                                                 | Export exists                                                       | Status |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------ |
| `core-buttons/buttons/action.ts` → `../../../addon/api.js`                                                 | `createBaseShapeIconLabelContent`                                     | ✓      |
| `core-buttons/buttons/change-deck.ts` → `../../../addon/api.js`                                            | `createBaseShapeIconLabelContent`                                     | ✓      |
| `core-buttons/index.test.ts` → `../../addon/api.js`                                                        | `createBaseShapeTextContent`                                          | ✓      |
| `start.ts` primitive resolution → `core-buttons/shared-card` wrapper registration in `core-buttons/index.ts` | Wrapper exists and resolves to `"shared"`                             | ✓      |
| `runtime.ts` / `start.ts` surface handling → `render/types.ts` / `render/reconciler.ts`                        | `full_surface` and `wrapper_id` are carried through render descriptions | ✓      |

## Summary

**Score:** 17/17 must-haves verified

Automated coverage and real CLI/device UAT now agree: the shipped Phase 17 fixture preserves legacy base-shape compatibility on key `0` while key `1` visibly bypasses the base card with `full_surface: true`.
