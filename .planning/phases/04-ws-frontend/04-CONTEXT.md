---
phase: 04-ws-frontend
status: ready
generated_for: plan-phase
gathered: 2026-06-23
mode: standard
---

# Phase 04 — CONTEXT

> Context for `/plan-phase 04`. Decisions captured during discuss-phase 04.

## Phase Boundary

WS bridge v3 with token handshake, vite plugin (`./vite`), frontend React app (`./react`), `useAddonChannel` hook, `<Deck>` + `<ButtonFrame>` + core button render surface.

## Decisions Captured (2026-06-23)

### 1. Addon frontend module loading — **build-time static import**

The CLI vite plugin reads `addons[]` from the loaded registry and statically imports each addon's `frontend.main` into the bundle. Build output bakes in all addon render modules.

- Addon manifest declares `frontend?: { main: string; styles?: string[] }` (already in v3 API contract).
- Vite plugin reads the registry, generates virtual `import` statements for each addon frontend/main, includes in `optimizeDeps.entries` for fast dev startup.
- HMR works via vite's module graph per-addon.
- Bundle size grows with addon count — acceptable for built-ins + small 3rd-party set; revisit if ecosystem grows large.

### 2. State sync model — **per-channel pub-sub**

Frontend subscribes to channels it cares about (via `useAddonChannel('system:cpu')`). Bridge pushes a `state` message with `Record<channel, lastPayload>` whenever subscribed channels update (debounced 100ms).

- Matches Phase 03's pub-sub architecture (no paradigm shift at the wire).
- Granular: bandwidth scales with subscription count, not deck size.
- WS protocol `state` message: `{ type: 'state', channels: Record<string, unknown> }`.
- Frontend maintains local subscription registry; on `state` message, fans out to React subscribers.

### 3. Reconnect strategy — **auto-reconnect with exponential backoff**

Frontend auto-reconnects on WS close with exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (capped). On successful reconnect, frontend re-sends `hello`, bridge re-sends `hello-ack` with fresh deck configs.

- Resilient to daemon restarts and brief network blips.
- Connection state machine in the React app: `connecting | open | reconnecting | failed`.
- Visual feedback in emulator shell: status badge in corner (Phase 05 will surface this).
- On `failed` after N attempts (e.g., 10), surface persistent error and stop retrying until user reloads.

## Locked Constraints (from earlier phases — do not re-litigate)

- WS protocol version 3. No `snapshot` message. `button-action` carries `gesture` (tap/dbl-tap-hold).
- Handshake: `hello` → `hello-ack` with `version, keyCount, config`. Mismatched token → close(4001).
- `button-action` shape: `{ deckId, position, gesture: 'tap' | 'dbl-tap' | 'hold' }`.
- Vite plugin uses `virtual:sireno/token` (dev) and `SIRENO_TOKEN` env var.
- Built-in addon render returns `null` in Phase 03; Phase 04 replaces with real React components that subscribe via `useAddonChannel`.
- React 19, Tailwind 4.

## Existing Code Insights (Phase 03 foundation)

### Reusable Assets

- **`createPubSub()`** (`packages/cli/src/core/pub-sub.ts`) — the channel bus. The frontend's `useAddonChannel` hook will subscribe to its local mirror of the same channels. The CLI's pub-sub feeds the WS bridge; the bridge pushes `state` to the frontend.
- **`Methods` interface** (`packages/cli/src/deck/methods.ts`) — the surface addons see. Public types for addons live in `packages/cli/src/api/` (Phase 04 deliverable).
- **`AddonButtonTypeDefinition.render(ctx)`** contract — Phase 04 fills `ctx` with `{ config, pressed, addonName, frameState }` from the bridge.
- **`AddonRegistry`** (`packages/cli/src/addon/registry.ts`) — already indexes button types by `type`. Phase 04 vite plugin reads this to know which addon frontend modules to import.

### Established Patterns

- **Module-per-file, barrel-per-folder** — applied to `core/`, `deck/`, `action/`, `addon/`. Phase 04 follows same.
- **Pure-TS where possible** — no React in `core/`, `deck/`, `action/`, `addon/api.ts`. React 19 only in `react/`, `frontend/`, and addon `frontend/main`.
- **`as unknown as Type` cast at addon contract boundary** — built-in buttons cast through `AddonButtonTypeDefinition` since the v3 contract uses `unknown` config.
- **Tests colocated** — `__tests__/` per folder (Phase 03 added module-adjacent tests).

### Integration Points

- **CLI → WS bridge**: pub-sub bus `flush` callback → bridge emits `state` (debounced 100ms).
- **WS bridge → CLI runtime**: `button-action` → `runtime.dispatchGesture(buttonId, gesture)`.
- **CLI → vite plugin**: plugin reads `AddonRegistry` (already loaded) at vite config time.
- **Vite plugin → frontend**: virtual modules `virtual:sireno/token` and `virtual:sireno/addons` (or similar).
- **Frontend → WS bridge**: WS client in `frontend/src/bridge/`, hooks in `frontend/src/hooks/`.

## Specific Ideas

- **WS bridge lifecycle**: spawn as part of CLI `run`/`start`. In `run` (dev), no token. In `start` (daemon), token generated and written to `$XDG_RUNTIME_DIR/sireno-deck.token`.
- **Vite child process**: CLI spawns `vite` with `SIRENO_TOKEN` env var, reads `READY <port>` from stdout, restarts on crash (max 3 with exponential backoff).
- **Initial frontend bundle**: shipped in `packages/cli/dist/frontend/` for prod. In dev, vite serves from `packages/cli/frontend/src/`.
- **Public API surface**: `sireno-deck` (main), `./api` (addon types), `./react` (hooks), `./vite` (plugin). The latter three are placeholders in `package.json` exports — Phase 04 fills them.

## Specific Questions Resolved (vs open)

### Resolved today (discuss-phase 04)

1. ✅ Addon frontend module loading → build-time static import (vite plugin).
2. ✅ State sync model → per-channel pub-sub with debounced `state` message.
3. ✅ Reconnect strategy → auto-reconnect with exponential backoff.

### Open / deferred

- Concrete React component shapes for `<Deck>`, `<ButtonFrame>`, addon `render()` return values — defer to implementation (Phase 04 plan).
- Whether to use HOC or render-prop pattern for `useButtonAction` — defer to implementation.
- Visual layout (grid dimensions, button spacing) — defer to Phase 08 (themes).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PLAN.md` §12 (WS bridge v3 protocol)
- `.planning/PLAN.md` §10 (token flow)
- `.planning/PLAN.md` §13 (frontend architecture)
- `.planning/phases/04-ws-frontend/04-PHASE.md` (phase deliverables)
- `packages/cli/src/core/pub-sub.ts` (channel bus — the data plane)
- `packages/cli/src/deck/methods.ts` (`Methods` interface — to be exported via `./api`)
- `packages/cli/src/addon/api-types.ts` (`SirenoAddon`, `isSirenoAddon`)
- `packages/cli/src/addon/registry.ts` (button-type index — source for vite plugin's addon frontend enumeration)

## Deferred Ideas (out of scope for Phase 04)

- Theme system (Phase 08) — button visuals stay minimal in Phase 04; `<ButtonFrame>` renders raw values.
- Hardware Playwright pipeline (Phase 06) — only affects real-mode rendering, not the frontend vite app itself.
- Emulator shell (Phase 05) — separate frontend vite app; no overlap with the deck frontend except WS protocol.
- Prod HTTP server with token injection (Phase 10) — frontend reads `window.__SIRENO_TOKEN__` in prod; dev uses `virtual:sireno/token` already.

---

_Phase: 04-ws-frontend_
_Context gathered: 2026-06-23 (standard mode)_
