---
phase: 10
area: public authoring exports and built package entrypoints
created: 2026-05-16
---

# Discovery: public authoring exports and built package entrypoints

## Relevant Files

| File | Role | Lines |
|------|------|-------|
| `packages/cli/package.json` | Declares the public package exports and current build contract | 47 |
| `packages/cli/tsdown.config.ts` | Defines which source entrypoints are actually built into `dist/` | 13 |
| `packages/cli/src/render/reconciler.ts` | Exports the helper authoring API (`createDeckButtonElement`, `createDeckSurfaceElement`, `createDeckTextElement`) | 402 |
| `packages/cli/src/render/jsx.ts` | Runtime stub intended for the explicit JSX opt-in entrypoint | 1 |
| `packages/cli/src/render/jsx.d.ts` | Declares `deck-button`, `deck-text`, and `deck-surface` for JSX consumers | 21 |
| `packages/cli/src/cli/commands/start.ts` | Uses `renderDeck()` and `createDeckSurfaceElement()` as the runtime integration seam | 213 |
| `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx` | Current authoring example; reveals that helper imports still use repo-local source paths | 36 |
| `README.md` | Documents the public addon authoring surface that should be shippable | 32 |

## Dependency Map

`public authoring exports`
  ← documented by: `README.md`, `.planning/phases/09-calendar-authoring-clarity/09-UAT.md`
  ← verified by: `packages/cli/fixtures/phase-9/tsconfig.jsx-authoring-example.json`, `packages/cli/src/render/reconciler.test.tsx`
  ← promised by: `packages/cli/package.json#exports`
  → built by: `packages/cli/tsdown.config.ts`
  → should expose: `packages/cli/src/render/jsx.ts`, `packages/cli/src/render/jsx.d.ts`, helper exports currently living in `packages/cli/src/render/reconciler.ts`
  ↔ runtime contract shared with: `packages/cli/src/cli/commands/start.ts`, `packages/cli/src/deck/runtime.ts`, bundled `date-time` addon render output

## Integration Points

- **Entry point:** `packages/cli/package.json#exports` is the release-facing contract for both `sireno-deck-cli` and `sireno-deck-cli/jsx`.
- **Build wiring:** `packages/cli/tsdown.config.ts` currently only declares `cli: "./src/cli/index.ts"`, so public addon authoring files are not emitted to the paths promised in `package.json`.
- **Shared authoring API:** helper constructors currently live in `packages/cli/src/render/reconciler.ts`, but the example in `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx` imports them via `../../src/...`, proving there is no packaged public helper entrypoint yet.
- **Docs/example contract:** `README.md` documents `sireno-deck-cli/jsx` as public, and Phase 9 verification/UAT assume a helper-based alternative also exists for external addon authors.

## Risks

### High
- **Release contract drift:** `package.json` advertises `./dist/index.js` and `./dist/render/jsx.{js,d.ts}`, but `pnpm --filter sireno-deck-cli build` emits neither path. This is the direct milestone blocker. Watch for fixes that only change docs or only change exports without changing build output. 
- **Public API shape ambiguity:** helper constructors exist, but there is no agreed public source entrypoint for them. A rushed fix could expose unstable internal modules or create another mismatch between docs, source, and built artifacts.

### Medium
- **Type/runtime split for JSX:** `src/render/jsx.ts` is an empty runtime stub while `jsx.d.ts` carries the real authoring value. Packaging must preserve both the runtime module and declaration file in the right location.
- **Build layout complexity:** `tsdown` currently emits nested files under `dist/packages/cli/src/...`, so aligning output may require either new explicit entries or a public facade file rather than relying on current internal paths.

### Low / Acceptable
- **Runtime feature regression risk:** the actual render/runtime path is well-covered and localized. The main work is packaging/public-surface alignment, not changing the core render behavior itself.

## Test Coverage

- Strong nearby coverage exists for the render helper and JSX contract in `packages/cli/src/render/reconciler.test.tsx`.
- Phase 9 added a focused authoring example plus standalone typecheck config, but that verification currently uses a local `paths` mapping instead of consuming the real built package.
- There is no direct release-facing test asserting that `pnpm --filter sireno-deck-cli build` emits the exact files promised by `packages/cli/package.json` or that the packaged addon authoring imports resolve from `dist/`.

## Recommendations

Before planning Phase 10:
- Treat this as a packaging/public-API slice, not a render-feature slice. The goal is to align **source entrypoints**, **package exports**, **build output**, and **docs/example imports** in one end-to-end release path.
- Plan one tracer bullet that makes the packaged `sireno-deck-cli/jsx` entrypoint real from build output, then a second tracer bullet that exposes the helper-based public import path and verifies the docs/example against the built package surface.
- Add a release-facing verification step that checks built artifact existence directly, not just TypeScript path mappings inside the repo.
