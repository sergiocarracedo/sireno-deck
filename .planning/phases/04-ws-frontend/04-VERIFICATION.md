---
phase: 04-ws-frontend
verified: 2026-06-23
status: passed
tests_total: 200
---

# 04-VERIFICATION — WS Bridge + Frontend

## Phase Goal

WS bridge v3 with token handshake + vite plugin + frontend React app + react hooks for addon channels and gesture dispatch. Verified end-to-end via 200 vitest tests.

## Must-haves verification

| Must-have                                                                                                                                                              | Status | Evidence                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| API types: AddonButtonRenderContext, AddonButtonActionContext, UseAddonChannelReturn                                                                                   | ✅     | src/api/addon.ts                                                           |
| WS messages: hello, hello-ack, deck-config, state, decks-list, show-overlay, button-action, method-call, method-call-result, select-deck, deck-active, dismiss-overlay | ✅     | src/api/protocol-internal.ts + src/render/protocol.ts                      |
| Bridge: ws server on 127.0.0.1, handshake with token (4001 on mismatch), broadcast, onMessage, onConnection, close                                                     | ✅     | src/render/ws-bridge.ts (8 tests)                                          |
| Vite spawn: child process, READY port line, restart with backoff                                                                                                       | ✅     | src/render/vite-server.ts (5 tests)                                        |
| sirenoDeck2() plugin: virtual:sireno/token, virtual:sireno/addons                                                                                                      | ✅     | src/vite/virtual-modules.ts (4 tests)                                      |
| Frontend React 19 + Tailwind 4                                                                                                                                         | ✅     | packages/cli/frontend/                                                     |
| Deck + ButtonFrame + ButtonRenderer                                                                                                                                    | ✅     | 3 components in packages/cli/frontend/src/components/                      |
| Deck render tests under jsdom                                                                                                                                          | ✅     | 3 tests in deck-render.test.tsx                                            |
| ChannelRegistry (singleton)                                                                                                                                            | ✅     | src/react/registry.ts                                                      |
| useAddonChannel / useDeck / useButtonAction                                                                                                                            | ✅     | 3 hooks in src/react/ + 5 tests                                            |
| WS client: hello on open + reconnect with backoff + state→ChannelRegistry                                                                                              | ✅     | frontend/src/bridge/client.ts (4 tests)                                    |
| Frontend integration: App wires WS + ChannelRegistry, deck renders                                                                                                     | ✅     | ws-integration.test.tsx (2 tests)                                          |
| Total ≥ 195 tests                                                                                                                                                      | ✅     | **200 passing**                                                            |
| Typecheck clean                                                                                                                                                        | ✅     | yes                                                                        |
| Per-package lint clean                                                                                                                                                 | ✅     | 0 warnings, 0 errors                                                       |
| Format clean                                                                                                                                                           | ✅     | 151 files conform                                                          |
| `./api`, `./react`, `./vite` sub-path exports from `sireno-deck`                                                                                                       | ✅     | package.json exports                                                       |
| Token handshake in dev (no token in dev mode)                                                                                                                          | ✅     | helloMessageSchema.token is optional                                       |
| Token injection via `virtual:sireno/token` (dev)                                                                                                                       | ✅     | sirenoDeck2() plugin exposes env var                                       |
| Production `window.__SIRENO_TOKEN__` injection (Phase 10)                                                                                                              | ⏳     | Deferred (prod server not built yet)                                       |
| `button-action` carries gesture (not raw down/up)                                                                                                                      | ✅     | buttonActionMessageSchema requires `gesture: 'tap' \| 'dbl-tap' \| 'hold'` |
| No `snapshot` message                                                                                                                                                  | ✅     | wsMessageSchema rejects `type: 'snapshot'`                                 |
| Vite plugin registers addon/theme folders                                                                                                                              | ✅     | sirenoDeck2() takes addons[] option                                        |

## Requirements traceability

- **R9** (WS bridge v3 handshake + button-action carries gesture + no snapshot): ✅
- **R10** (WS token dev/prod flow): ✅ dev mode via env + virtual module; prod mode deferred to Phase 10
- **R11** (vite plugin registers addon/theme folders): ✅

## Smoke

```
pnpm exec vitest run
  Test Files: 25 passed (25)
  Tests:       200 passed (200)
  Duration:    ~1.8s

pnpm --filter sireno-deck typecheck
  (clean)

pnpm --filter sireno-deck lint
  Found 0 warnings and 0 errors

pnpm format:check
  All matched files use the correct format.
```

## Tracer bullet

Plan 04-03's `ws-integration.test.tsx`:

- Renders `<App />` under jsdom.
- Verifies 2 buttons appear (mock deck).
- Simulates a click on the `core:action` button.
- Asserts the click publishes `runtime:button-tap` to the ChannelRegistry.

This proves: ChannelRegistry works → WS client → App → Button → publish → channel.

## Notes

- The mock deck in `App.tsx` is replaced by real data once the WS bridge sends `deck-config`. That wire-up happens in Phase 06 (hardware) and Phase 09 (daemon) when the CLI starts a real renderer.
- `useButtonAction` publishes to channels but no subscriber exists yet. Phase 09 will subscribe in the CLI runtime.
- `frontend/src/bridge/store.ts` was planned but made redundant by `ChannelRegistry`. Skipped.
- The CLI `run`/`start` commands are still placeholders — Phase 09 wires the real spawn pipeline (vite + ws bridge + renderer).

## Status: PASSED
