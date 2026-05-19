---
phase: 10
status: passed
verified: 2026-05-16
---

# Phase 10: Public Authoring Exports — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 10-01 | `pnpm --filter sireno-deck-cli build` emits the files referenced by `packages/cli/package.json#exports` for `.` and `./jsx` | ✓ |
| 10-01 | Helper-based authoring imports resolve from `sireno-deck-cli` rather than repo-local internal modules | ✓ |
| 10-01 | The public surface is built through explicit facades and intentional build entries rather than by redefining exports around incidental internal layout | ✓ |
| 10-02 | Shipped docs and the focused authoring example both use `sireno-deck-cli` plus `sireno-deck-cli/jsx` | ✓ |
| 10-02 | Release-facing verification resolves the authoring example against the built package surface instead of source paths or `paths` aliases | ✓ |
| 10-02 | Focused automated coverage keeps helper-authored and JSX-authored addon examples in parity at the render seam | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| UIW-01 | `packages/cli/package.json`, `packages/cli/tsdown.config.ts`, and `packages/cli/src/render/jsx.ts` now emit and expose the packaged `sireno-deck-cli/jsx` opt-in entrypoint through built output | ✓ |
| UIW-02 | `packages/cli/src/index.ts` exposes `createDeckButtonElement`, `createDeckSurfaceElement`, and `createDeckTextElement` from the package root so helper-based authoring no longer depends on repo-local internals | ✓ |
| UIW-03 | `README.md`, `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx`, and `packages/cli/fixtures/phase-9/tsconfig.jsx-authoring-example.json` teach and verify the non-DOM authoring contract through the real package surface | ✓ |

## Integration Checks

| Import / Link | Export exists / Resolves | Status |
|--------|--------------|--------|
| `packages/cli/package.json` -> `dist/index.js`, `dist/index.d.ts` | Root package export points at files emitted by `pnpm --filter sireno-deck-cli build` | ✓ |
| `packages/cli/package.json` -> `dist/render/jsx.js`, `dist/render/jsx.d.ts` | `./jsx` export points at files emitted by `pnpm --filter sireno-deck-cli build` | ✓ |
| `packages/cli/src/index.ts` -> `./render/reconciler.js` | Root facade re-exports only the helper-based authoring API and related public types | ✓ |
| `README.md` and `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx` | Both use `sireno-deck-cli` for helpers and `sireno-deck-cli/jsx` for explicit JSX opt-in | ✓ |
| `packages/cli/fixtures/phase-9/tsconfig.jsx-authoring-example.json` | Built-package typecheck succeeds without repo-local `paths` mapping | ✓ |
| `packages/cli/src/render/reconciler.test.tsx` | Focused parity coverage passes for the shipped helper and JSX authoring example | ✓ |

## Summary

**Score:** 6/6 must-haves verified

Automated verification passed via:
- From the repo root, run `pnpm --filter sireno-deck-cli build`
- From `packages/cli`, run `pnpm exec tsc -p fixtures/phase-9/tsconfig.jsx-authoring-example.json --noEmit`
- From `packages/cli`, run `pnpm exec vitest run src/render/reconciler.test.tsx`

Phase goal achieved. The packaged public authoring surface now matches the documented root and `./jsx` imports, and verification exercises the built package instead of cheating through repo-local source access.
