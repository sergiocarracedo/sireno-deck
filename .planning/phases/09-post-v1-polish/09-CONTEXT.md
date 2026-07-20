# Phase 9: Post-v1 polish - Context

**Gathered:** 2026-07-20
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

Close remaining hardware UX gaps (splash on boot, black on shutdown, back-button-onhold in split mode), rework the emulator side panel into a navigable multi-page console (device / bridge logs / service logs / addons / config), fix the device-model swap bug, and port the system-status addon from the legacy repo into the current addon architecture.

</domain>

<decisions>
## Implementation Decisions

### Back-button onhold in split mode
- Render the back button **only when it has an action** in the current state. No action → no render.
- When rendered, onhold gesture navigates to the main deck's overlay layer (where applicable).

### Hardware splash on boot
- On `runPipeline` start, before Playwright/frontend init, send `packages/cli/src/assets/logoFull.png` directly to the real hardware via the device transport. Bypasses frontend entirely.
- **Does not apply to the emulator.**

### Hardware shutdown
- On `outputHandle.stop()` (or signal-driven shutdown path), push a black frame to the real hardware so the deck doesn't freeze on the last rendered image.
- **Does not apply to the emulator.**

### Emulator side panel
- Multi-page navigation via **react-router routes** (deep-linkable, browser back works; emulator already uses react-router for deck routes, will nest under `/emulator/*`).
- Five pages: **Device emulation** (default, current iframe + device selector) / **Bridge Logs** / **Service logs** / **Addons** / **Config**.

### Service-logs IPC
- New WS sub-protocol message: `{type: "service-log", level: "info"|"warn"|"error"|"debug", msg: string, ts: number}`. CLI publishes via the existing bridge. Emulator subscribes + appends to its store.
- Loses logs on disconnect (acceptable — emulator + CLI restart together typically).

### Bridge-logs storage
- **Ring buffer in emulator memory, cap ~1000 messages**, oldest evicted.
- All wsBridge messages stored **regardless of active page** (so navigation doesn't lose history).
- Filter UI: direction (all/sent/received) + channel (all + per-channel) + type (all/message) dropdowns + content substring text input. Time range optional (last 1m/5m/15m/all).

### Device-model swap
- When the device-model dropdown in the side panel changes, propagate the change through to the iframe (the frontend re-renders with the new key count). Wire device-model via URL param + postMessage as fallback.

### System-status addon
- **Re-implement** against current addon API (don't copy legacy verbatim). 4 split surfaces: cpu / ram / disk / net. Each occupies one button slot. Positions 0 + 5 in the main deck are status buttons.

### Agent's Discretion
- Exact ring buffer cap (suggested ~1000, may tune).
- Bridge-logs filter UI styling (functional > aesthetic).
- Service-log message schema (level enum + msg string + ts; safe to add fields later).
- Splash image encoding (PNG path is fixed; codec conversion to whatever the device wants is implementation detail).

</decisions>

<specifics>
## Specific Ideas

- Service-log WS message should be schema-validated (`zod`) and added to `protocol-internal.ts`.
- Bridge-logs ring buffer must survive navigation but NOT emulator restart (in-memory only is fine).
- Back-button onhold: needs to be aware of current overlay-layer state. If no overlay is available, the gesture is a no-op (button doesn't render anyway).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/cli/commands/run.ts` — orchestrator entry point (hardware splash + shutdown)
- `packages/cli/src/render/vite-server.ts` — frontend vite spawn (where to inject splash before Playwright)
- `packages/cli/src/outputClient/real.ts` — hardware transport; see how the device renders frames
- `packages/cli/src/api/protocol-internal.ts` — WS message schema; add `service-log` here
- `packages/cli/emulator/src/App.tsx`, `Shell.tsx`, `SidePanel.tsx` — emulator layout
- `packages/cli/emulator/src/bridge.ts` — emulator bridge abstraction
- `packages/cli/frontend/src/components/Deck.tsx` — back button rendering logic; check current `splitAction` rule
- `packages/cli/src/deck/runtime.ts:332-373` — back button gesture handler (`handleSystemButton`); needs onhold branch
- Legacy repo (read-only reference): `packages/cli/src/builtin-addons/system-status/` + `surface helpers/` — for behavior parity, NOT for copy-paste
- `.planning/PROJECT.md` — zod .strict() on new schemas, named exports, vitest

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConfigWatcher` (chokidar wrapper): pattern for tailing a log file (option not chosen but available).
- `pino` logger in CLI: structured JSON output, can be piped into a sidecar file.
- `core/store.ts` (frontend): pubsub store pattern; emulator can mirror for bridge-log ring buffer.
- `ButtonFrame variant='error'`: already supports error styling; relevant if status surfaces error states.

### Established Patterns
- Backed by WS bridge with discriminator-union schemas (`z.discriminatedUnion`) — new `service-log` message must follow this pattern.
- Frontend addons use surface split pattern (each surface = one button slot); 4 split surfaces for status is the existing convention.
- Emulator uses `WebSocketLike` abstraction; `service-log` and bridge-log capture must hook into both real and emulated transports.

### Integration Points
- `runPipeline` start: insert splash send BEFORE `outputClient.init` returns.
- `runPipeline` finally block: insert black-frame send BEFORE `outputHandle.stop()`.
- Bridge schema additions: edit `packages/cli/src/api/protocol-internal.ts` + `packages/cli/emulator/src/bridge.ts` symmetrically.
- Emulator routes: extend existing react-router config; nested under `/emulator/`.

</code_context>

<deferred>
## Deferred Ideas

- Persistent bridge-log storage (to disk): out of scope — ring buffer only.
- Config editor inside emulator: out of scope — viewer only.
- Multiple status metrics per surface (e.g. CPU temp + frequency on one slot): deferred to a future phase if needed.

</deferred>

---
*Phase: 09-post-v1-polish*
*Context gathered: 2026-07-20*
