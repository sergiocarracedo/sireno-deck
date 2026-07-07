---
phase: 04-ws-frontend
plan: 04-02
completed: 2026-06-23
tests_added: 7
tests_total: 189
status: done
---

# 04-02-SUMMARY — Vite Plugin + Frontend React App

## What was built

The frontend half of Phase 04:

1. **`src/vite/`** — the `sirenoDeck2()` vite plugin that exposes:
   - `virtual:sireno/token` (returns the runtime `SIRENO_TOKEN` env value)
   - `virtual:sireno/addons` (returns `import` statements + an `addons` array of `{ name, main, styles }`)
   - `READY <port>` stdout message on `listening` event for the CLI to parse.
   - Addon names escaped (only `[a-zA-Z0-9_$]` kept) to be valid JS identifiers.

2. **`packages/cli/frontend/`** — standalone frontend workspace package:
   - `vite.config.ts` — registers `react()`, `@tailwindcss/vite`, and `sirenoDeck2({ token: process.env.SIRENO_TOKEN })`.
   - `index.html` — dark background, mount point `#root`.
   - `src/index.css` — `@import "tailwindcss"; :root { color-scheme: dark }`.
   - `src/main.tsx` — React 19 `createRoot` mount.
   - `src/App.tsx` — mock deck state, displays the active deck + ws auth state.
   - `src/components/Deck.tsx` — grid of buttons; dispatches tap/dbl-tap/hold via callbacks; core:change-deck buttons trigger `onNavigate(targetDeck)`.
   - `src/components/ButtonFrame.tsx` — single button with pointer/keyboard handlers for tap, dbl-tap (onDoubleClick), hold (onContextMenu).
   - `src/components/ButtonRenderer.tsx` — selector that picks a per-type React component, falling back to `ButtonFrame`.
   - `src/__tests__/deck-render.test.tsx` — 3 tests under jsdom env.

## Key files

- `src/vite/virtual-modules.ts` (~50 lines)
- `src/vite/index.ts` (barrel)
- `src/vite/index.test.ts` (4 tests)
- `packages/cli/frontend/vite.config.ts`
- `packages/cli/frontend/index.html`
- `packages/cli/frontend/src/{main.tsx, App.tsx, index.css}`
- `packages/cli/frontend/src/components/{Deck, ButtonFrame, ButtonRenderer}.tsx`
- `packages/cli/frontend/src/__tests__/deck-render.test.tsx` (3 tests)
- `pnpm-workspace.yaml` — added `packages/cli/frontend`

## Decisions made

- **Tailwind 4 via `@tailwindcss/vite`** — no `tailwind.config.js` needed; tokens declared via `@theme` block in CSS.
- **Pointer + keyboard events** on ButtonFrame: pointer down/up + click for tap, doubleClick for dbl-tap, contextmenu for hold (Phase 05 emulator will wire this to a more controllable gesture machine).
- **Addon name escaping** strips everything except `[a-zA-Z0-9_$]` so names like `@scope/with-dash` become `_scope_with_dash` (valid JS identifier).
- **Mock deck in App.tsx** — Phase 04-03 wires real WS bridge data; for now a static 3-button deck renders correctly.

## Bugs / adjustments during execution

- `getByText("Media")` matched both the `<span>` and the `<button>` containing it. Switched to `container.querySelector('[data-button-type="..."]')` selectors.
- Addon name escape regex was originally written for scoped names like `@scope/with-dash` but the existing test expected the dash to survive. Changed both the test assertions to match the actual escape behavior (`-` → `_`, `@` → `_`).
- pnpm workspace didn't pick up the new `packages/cli/frontend` package by default. Added it explicitly to `pnpm-workspace.yaml`.

## Notes for downstream

- Plan 04-03 will rewrite App.tsx to subscribe to `useAddonChannel` and `useBridge` instead of using mock data.
- The plugin's `configureServer` writes `READY <port>` to stdout — Phase 04-01's `spawnViteServer` already parses this regex.
- `virtual:sireno/token` currently returns empty string when `SIRENO_TOKEN` is unset (dev mode). Phase 10 prod HTTP server will inject `<script>window.__SIRENO_TOKEN__='…'</script>` into `index.html` before the bundle loads.

## Smoke

- `pnpm exec vitest run` → 189/189 passing (was 182; Plan 02 added 7)
- `pnpm --filter sireno-deck typecheck` → clean
- `pnpm --filter sireno-deck lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 140 files conform
