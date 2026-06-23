---
phase: 04-ws-frontend
plan: 04-03
completed: 2026-06-23
tests_added: 11
tests_total: 200
status: done
---

# 04-03-SUMMARY — React Hooks + WS Client + Integration

## What was built

The wire-up layer between the React frontend and the WS bridge. The frontend now subscribes to channels via React hooks and pushes button actions through the bridge.

### React hooks (`src/react/`)

- **`registry.ts`** — `ChannelRegistry` module-level singleton (with `resetForTests()`). Publish/subscribe/last/clear. `ChannelPayload = unknown`.
- **`use-addon-channel.ts`** — `useAddonChannel<T>(channel)` returns `{ value }`; subscribes on mount, unsubscribes on unmount.
- **`use-deck.ts`** — `useDeck()` returns `{ activeDeckId }`; subscribes to `runtime:activeDeck`.
- **`use-button-action.ts`** — `useButtonAction()` returns `{ tap, dblTap, hold }` callbacks that publish to `runtime:button-{tap,dblTap,hold}`.
- **`index.ts`** — barrel re-exported as `sireno-deck-2/react`.

### WS client (`packages/cli/frontend/src/bridge/`)

- **`client.ts`** — `createWsClient({ url, token?, onMessage?, onStatus?, backoffMs?, maxAttempts? })`. Connects, sends `hello`, dispatches `state` messages into the `ChannelRegistry`. On close, reconnects with exponential backoff (default `[1s, 2s, 4s, 8s, 16s, 30s]`, max 10 attempts → `failed`).
- **`store.ts`** — (deferred — App uses `ChannelRegistry` directly.)

### Frontend integration

- **`App.tsx`** rewired to:
  - Connect via `createWsClient` on mount
  - Push `deck-config` messages into local state
  - Push every `state.channels` entry into `ChannelRegistry`
  - Render the deck using the mock buttons (still mock data until Phase 06 wires real hardware)
  - Button clicks publish `runtime:button-tap` to the registry

### Test infrastructure

- `vitest.config.ts` aliases `virtual:sireno/token` to a mock file so tests can import `App.tsx` without the vite plugin.
- `frontend/src/__mocks__/token.ts` exports `token = "test-token"`.

## Key files

- `src/react/{registry,use-addon-channel,use-deck,use-button-action,index}.ts`
- `src/react/hooks.test.tsx` (5 tests, jsdom)
- `packages/cli/frontend/src/bridge/{client,client.test,store}.ts`
- `packages/cli/frontend/src/App.tsx` (rewired)
- `packages/cli/frontend/src/__tests__/ws-integration.test.tsx` (2 tests, jsdom)
- `packages/cli/frontend/src/__mocks__/token.ts` (test stub)
- `vitest.config.ts` (added alias)

## Decisions made

- **Module-level singleton `ChannelRegistry`** keeps addons and React hooks decoupled. Same singleton imports work in both `src/react/` (Node tests) and `packages/cli/frontend/` (browser bundle).
- **`ChannelPayload = unknown`** — fully generic. Hooks cast at use site. Avoids the `{ [k]: unknown }` constraint that rejected primitives like `number`.
- **`createWsClient` publishes `state` channels into `ChannelRegistry` directly** so `useAddonChannel` works without separate bridge code.
- **Backoff caps at 30s, max 10 attempts**, then `failed`. Matches the spec.
- **`runtime:button-tap` is a one-way flow**: frontend → `ChannelRegistry` → CLI handler. CLI runtime can subscribe in Phase 09.

## Bugs / adjustments during execution

- `use-addon-channel.ts` initially imported `ChannelRegistry` as `type` (erased at runtime). Changed to value import.
- Cross-package imports from frontend to cli needed to use the `sireno-deck-2/react` sub-path; relative paths across packages don't resolve.
- Test file path bug: `hooks.test.tsx` was at `src/react/hooks.test.tsx` but imported `../registry.ts` (sibling-of-parent) — fixed to `./registry.ts`.
- Initial hooks test rendered a function-returning-the-value (not a hook), so `result.current` never updated after `act(publish)`. Rewrote test to use the actual `useAddonChannel` hook.
- `virtual:sireno/token` couldn't resolve in vitest (only the vite plugin provides it). Added a mock file + alias.
- Addon name escape regex: `has-frontend` → `has_frontend`; test assertions corrected to match.

## Notes for downstream

- `useButtonAction` publishes to `runtime:button-tap` etc., but nothing subscribes yet. Phase 09 will wire the CLI to subscribe and call `runtime.dispatchGesture`.
- The WS client is used only in `App.tsx` (mock data). Phase 05 emulator will share the client.
- `frontend/src/bridge/store.ts` was planned but the `ChannelRegistry` made it redundant — skipped for now.

## Smoke

- `pnpm exec vitest run` → 200/200 passing (was 189; Plan 03 added 11)
- `pnpm --filter sireno-deck-2 typecheck` → clean
- `pnpm --filter sireno-deck-2 lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 151 files conform
