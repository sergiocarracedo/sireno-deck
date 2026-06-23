---
phase: 04-ws-frontend
plan: 04-01
completed: 2026-06-23
tests_added: 27
tests_total: 182
status: done
---

# 04-01-SUMMARY — Public API + WS Protocol + Bridge + Vite Spawn

## What was built

The foundation for Phase 04: a typed public API surface for addons, zod schemas for the WS protocol v3 (12 message types), a `ws` server with handshake + broadcast + token auth, and a vite child-process spawn manager with READY-port matching and restart-with-backoff.

### Public API (`src/api/`)

- `addon.ts` — re-exports `Methods`, `GestureKind`, plus `AddonButtonRenderContext`, `AddonButtonActionContext`, `UseAddonChannelReturn`, `ChannelPayload`, `Unsubscribe`.
- `protocol-internal.ts` — zod schemas + types for all 12 WS messages + `PROTOCOL_VERSION = 3`.
- `index.ts` — barrel re-exporting both as `sireno-deck-2/api`.

### WS protocol (`src/render/protocol.ts`)

Same zod schemas, re-exported from `api/protocol-internal.ts`. Messages:

- Client → server: `hello`, `button-action`, `method-call`, `select-deck`, `deck-active`, `dismiss-overlay`
- Server → client: `hello-ack`, `deck-config`, `state`, `decks-list`, `show-overlay`, `method-call-result`

Discriminated union via `wsMessageSchema` rejects unknown types. `gestureKindSchema` accepts only `tap | dbl-tap | hold`.

### WS bridge (`src/render/ws-bridge.ts`)

`startWsBridge({ expectedToken?, handshakeTimeoutMs? })` returns a `WsBridge`:

- Listens on `127.0.0.1` with random port (resolved from `wss.address()`).
- Handshake: first message must be `hello`; on `expectedToken` mismatch → close 4001.
- `hello-ack` is sent automatically with `{ keyCount: 15, config: {} }`.
- Invalid JSON → close 4002. Invalid message → close 4003. Handshake timeout → close 4000.
- `broadcast(msg)` sends to all open clients. `onMessage(handler)` for incoming post-handshake. `onConnection(handler)` after handshake completes.
- `close()` terminates all clients + stops the server.

### Vite spawn (`src/render/vite-server.ts`)

`spawnViteServer({ command, args, cwd, env, readyMatcher, maxRestarts, restartBackoffMs })`:

- Spawns child process, listens to stdout for `READY <port>` (configurable regex).
- Emits `emitter` events: `ready` (port), `stdout`, `stderr`, `restart` (count, backoffMs), `crash` (exitCode).
- On crash after READY: restarts up to `maxRestarts` (default 3) with backoff (default `[500, 1000, 2000]`ms).
- `stop()` sends SIGTERM, escalates to SIGKILL after 2s.

## Key files

- `src/api/addon.ts` (~25 lines)
- `src/api/protocol-internal.ts` (~100 lines, zod schemas)
- `src/api/index.ts` (barrel)
- `src/api/index.test.ts` (5 tests)
- `src/render/protocol.ts` (re-export barrel)
- `src/render/protocol.test.ts` (8 tests)
- `src/render/ws-bridge.ts` (~100 lines)
- `src/render/ws-bridge.test.ts` (8 tests)
- `src/render/vite-server.ts` (~100 lines)
- `src/render/vite-server.test.ts` (5 tests)
- `src/render/index.ts` (barrel)
- `packages/cli/package.json` — added `ws ^8.18.0`, `@types/ws ^8.5.13`

## Decisions made

- **`protocol-internal.ts` lives under `src/api/`**, re-exported from `src/render/protocol.ts`. One source of truth; both surfaces can import.
- **Handshake timeout 5s** (overridable). Prevents slow or malicious clients from holding connections open without identifying.
- **Close codes**: 4000 (handshake timeout), 4001 (token mismatch / invalid hello), 4002 (invalid JSON), 4003 (invalid message), 4004 (expected hello first).
- **Default keyCount 15** in hello-ack. Real value flows from the hardware/emulator in Phase 06. Phase 04 frontend uses this default.
- **Backoff `[500, 1000, 2000]`ms** for vite spawn restarts. Plenty for transient crashes; doesn't retry forever.

## Bugs / adjustments during execution

- `protocol-internal.ts` was initially in `src/api/` but `src/render/protocol.ts` re-exported via `./protocol-internal.ts`. Fixed to `../api/protocol-internal.ts`.
- `onMessage` test in ws-bridge.test.ts: the Promise generic was `(msg: unknown) => void` instead of `unknown`, causing typecheck error. Changed to `Promise<unknown>` and cast result.
- `vite-server.ts` had `...(env ?? {})` lint warning (useless fallback). Changed to conditional spread.
- Vite-server test for stdout was racing the READY match — fixed to check `stdout.length > 0` instead.

## Notes for downstream

- `WsBridge` has no token-rotation logic yet. Phase 10 will wire token persistence to `$XDG_RUNTIME_DIR/sireno-deck-2.token`.
- `spawnViteServer` doesn't yet spawn a real vite process — it's a generic child-process spawner. Phase 04-02 wires it to actual `vite` invocations with the `sirenoDeck2()` plugin.
- `hello-ack.keyCount` is currently a fixed `15`. Phase 04-02/05 will read it from the device (real mode) or `--device-model` (emulator).

## Smoke

- `pnpm exec vitest run` → 182/182 passing (was 155; Plan 01 added 27)
- `pnpm --filter sireno-deck-2 typecheck` → clean
- `pnpm --filter sireno-deck-2 lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 127 files conform
