---
phase: 5
status: passed
verified: 2026-05-13T22:21:16+02:00
---

# Phase 5: Addon System — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 05-01 | `packages/cli/src/config/loader.ts` performs bootstrap addon discovery before full button validation | ✓ |
| 05-01 | `packages/cli/src/addon/registry.ts` registers button definitions with a core envelope plus addon-owned Zod payload schema | ✓ |
| 05-01 | `packages/cli/src/deck/runtime.ts` hosts generic addon button instances instead of feature-specific built-in branches | ✓ |
| 05-01 | `builtin-addons/core-buttons/src/index.ts` exports a bundled button type through the shared addon contract | ✓ |
| 05-01 | Example config uses the redesigned core-envelope-plus-inline-fields button shape | ✓ |
| 05-02 | `packages/cli/src/addon/manifest.ts` validates addon manifests including `apiVersion` | ✓ |
| 05-02 | `packages/cli/src/addon/loader.ts` loads both local-folder and npm addon entrypoints through one path | ✓ |
| 05-02 | `packages/cli/src/cli/commands/start.ts` skips broken addons with warnings instead of aborting the CLI | ✓ |
| 05-02 | Addon `apiVersion` mismatches are rejected with a clear config/startup error | ✓ |
| 05-02 | Loader tests cover local, npm, broken import, and `apiVersion` mismatch cases | ✓ |
| 05-03 | A bundled addon can expose reusable assets that button config can reference by path | ✓ |
| 05-03 | The addon contract supports registration of a custom deck type with preconfigured button layout generation | ✓ |
| 05-03 | `builtin-addons/emoji-selector/src/index.ts` boots through the same addon loader path as other bundled addons | ✓ |
| 05-03 | The emoji selector addon renders category navigation and selection behavior through the addon-first runtime | ✓ |
| 05-03 | Runtime tests cover addon-driven navigation/deck generation and emoji selector favorites behavior | ✓ |
| 05-06 | `config.yml` clearly states that the shipped local/npm addon examples are disabled illustrations and will not load or warn until enabled | ✓ |
| 05-06 | Loader/startup coverage proves disabled addons are skipped silently while enabled broken addons still produce startup warnings | ✓ |
| 05-06 | Future UAT runs have a repo-pinned example of the broken-addon isolation contract instead of relying on ambiguous manual setup | ✓ |
| 05-07 | Bundled addon asset files used by `config.yml` are icon-safe SVGs without baked 72x72 card chrome | ✓ |
| 05-07 | The existing icon slot in `packages/cli/src/render/text-image.ts` renders those assets as visible on-device icons | ✓ |
| 05-07 | Renderer tests assert icon-region pixel changes strongly enough to catch blank-icon regressions | ✓ |
| 05-08 | Emoji entry buttons render with addon asset icons instead of ASCII aliases or `U+...` fallbacks for the bundled emoji set | ✓ |
| 05-08 | Favorites decks reuse the same emoji-image asset map as category decks, so configured built-in favorites stay image-backed | ✓ |
| 05-08 | Addon/runtime tests cover image-backed emoji entries and an explicit fallback path for unsupported emoji values | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| ADDN-01 | `packages/cli/src/addon/loader.ts`, `packages/cli/src/addon/loader.test.ts` local-folder path | ✓ |
| ADDN-02 | `packages/cli/src/addon/loader.ts`, `packages/cli/src/addon/loader.test.ts` npm path | ✓ |
| ADDN-03 | `packages/cli/src/cli/commands/start.ts`, `packages/cli/src/cli/commands/start.test.ts` warning isolation | ✓ |
| ADDN-04 | `packages/cli/src/addon/api.ts`, bundled addon button definitions, runtime rendering tests | ✓ |
| ADDN-05 | `packages/cli/src/addon/api.ts`, `packages/cli/src/core/schemas.ts`, emoji selector deck type | ✓ |
| ADDN-06 | `packages/cli/src/addon/registry.ts`, `config.yml`, `packages/cli/src/render/text-image.ts`, bundled addon asset files, renderer icon-region test | ✓ |
| ADDN-07 | `packages/cli/src/addon/manifest.ts`, startup fatal path, loader tests | ✓ |
| ADDN-10 | `builtin-addons/emoji-selector/src/index.ts`, bundled `emoji-*.svg` assets, `builtin-addons/emoji-selector/src/index.test.ts`, `packages/cli/src/deck/runtime.test.ts` | ✓ |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `packages/cli/src/config/loader.ts` -> `validateBootstrapConfig` | `packages/cli/src/core/schemas.ts` exports `validateBootstrapConfig` | ✓ |
| `packages/cli/src/cli/commands/start.ts` -> `loadConfiguredAddons` | `packages/cli/src/addon/loader.ts` exports `loadConfiguredAddons` | ✓ |
| `packages/cli/src/addon/builtin.ts` -> bundled emoji selector addon | `builtin-addons/emoji-selector/src/index.ts` exports default addon | ✓ |
| Runtime/config path -> addon deck definitions and asset resolution | `packages/cli/src/addon/api.ts` and `packages/cli/src/addon/registry.ts` expose deck/assets contract | ✓ |
| Emoji selector entry rendering -> bundled emoji icon assets | `builtin-addons/emoji-selector/src/index.ts` maps built-in emoji values to `addon://emoji-selector/emoji-*.svg` assets | ✓ |
| Renderer icon path -> shipped bundled asset regression test | `packages/cli/src/render/text-image.test.ts` exercises `favorites.svg` through `renderTextImage` | ✓ |

## Summary

**Score:** 24/24 must-haves verified

All automated checks passed. Hardware verification was approved after re-running Phase 5 with the committed fixture set under `packages/cli/fixtures/phase-5/`. Phase goal achieved.
