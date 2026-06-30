---
phase: 05-emulator
plan: 05-02
completed: 2026-06-23
tests_added: 4
tests_total: 228
status: done
---

# 05-02-SUMMARY — emulator workspace package

## What was built

A separate Vite + React 19 + Tailwind 4 emulator shell at `packages/cli/emulator/`. It renders a 3-column layout: side panel (deck picker, action log, WS message log, state inspector) on the left, a center iframe pointing at the frontend vite URL (`http://127.0.0.1:52937`), and a small status footer.

The shell connects independently to the CLI WS bridge (token handshake) and provides the per-deck grid (cells for each key) — mouse events on the grid become gestures that the shell sends over WS to the CLI runtime.

## Key files

- `packages/cli/emulator/package.json` — workspace package, React 19 + Vite 6 + Tailwind 4 + jsdom test env
- `packages/cli/emulator/vite.config.ts` — plugins (react + tailwind), `resolve.alias` for `@sireno-deck/cli` and `@/*`
- `packages/cli/emulator/tsconfig.json` — extends base, `paths` map for cross-package alias, `rootDir: "../.."` to allow `../src/index.ts` resolution
- `packages/cli/emulator/vitest.config.ts` — jsdom env, same aliases as vite
- `packages/cli/emulator/index.html` — root HTML with `<div id="root">`
- `packages/cli/emulator/src/main.tsx` — entry, mounts `<App />`
- `packages/cli/emulator/src/index.css` — `@import "tailwindcss";`
- `packages/cli/emulator/src/App.tsx` — layout: `<Shell />`
- `packages/cli/emulator/src/Shell.tsx` — 3-column grid, wires panel + iframe + status
- `packages/cli/emulator/src/SidePanel.tsx` — deck picker + action log + ws log + state inspector
- `packages/cli/emulator/src/DeckFrame.tsx` — grid of key cells (mouse → gesture → WS)
- `packages/cli/emulator/src/__tests__/setup.ts` — `afterEach(cleanup)` for jsdom
- `packages/cli/emulator/src/__tests__/shell-render.test.tsx` — 4 tests
- `pnpm-workspace.yaml` — added `packages/cli/emulator` entry
- `packages/cli/src/index.ts` — added DEVICE_MODELS + friends to barrel for cross-package imports

## Decisions made

- **`@sireno-deck/cli` cross-package alias**: the emulator imports `{ DEVICE_MODELS, type DeviceModel }` from `@sireno-deck/cli`. This required (1) adding those exports to the cli barrel, and (2) configuring vite **and** vitest to alias the package name to `../src/index.ts`. Both configs use the array form (`{ find: /^@sireno-deck\/cli$/, replacement: ... }`).
- **tsconfig `rootDir: "../.."`**: the alias path resolves to `../src/index.ts` (one level up from emulator). TypeScript's `rootDir` is inferred from `include` paths; without explicit override, TS infers it as the package root and complains that `../src/index.ts` is outside. Setting `rootDir: "../.."` includes both emulator and cli sources under the program root.
- **`afterEach(cleanup)` in setup.ts**: with `globals: false`, vitest doesn't auto-cleanup the jsdom between tests. Without it, tests bleed DOM state.

## Bugs / adjustments during execution

1. **vite.config.ts had a stray `},`** — closing brace count was off by one after the alias array.
2. **vitest did not pick up vite's `resolve.alias`** — vitest uses its own config. Added the same alias to `vitest.config.ts` explicitly.
3. **tsconfig rootDir inherited or inferred incorrectly** — multiple attempts before settling on `rootDir: "../.."` with explicit `noEmit: true` so vitest can still run.
4. **`@sireno-deck/cli` resolved to dist (built JS) but dist didn't exist** — would have required a full build step. Resolved by aliasing directly to source (`../src/index.ts`), avoiding the build dependency.
5. **Project composite references broke cli build** — `composite: true` + `noEmit: false` conflicts with `allowImportingTsExtensions`. Rolled back the composite experiment; the alias approach works.

## Notes for downstream

- Plan 05-03 will add: gesture.ts (mouse → gesture using Phase 03 gesture-state), bridge.ts (WS client with exponential backoff), and rewire `DeckFrame` + `SidePanel` to use them.
- The emulator tests live in this package's own vitest config (jsdom env, separate aliases). They are NOT picked up by the root `vitest run` because the root config is node-only. To run them: `cd packages/cli/emulator && pnpm exec vitest run`.

## Smoke

- `pnpm exec vitest run` (root, cli only): 224/224 passing
- `cd packages/cli/emulator && pnpm exec vitest run`: 4/4 passing
- `pnpm --filter sireno-deck typecheck`: clean
- `pnpm --filter @sireno-deck/emulator typecheck`: clean
- `pnpm --filter sireno-deck lint`: 0 warnings, 0 errors
- `pnpm format:check`: clean (178 files)
