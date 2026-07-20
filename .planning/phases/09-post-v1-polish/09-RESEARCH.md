# Phase 9: Post-v1 polish - Research

**Status:** Compacted from existing codebase knowledge (context-critical mode, web research skipped).

## Don't Hand-Roll

- **Ring buffer** — Node.js has no built-in ring buffer. Use a simple circular array + `Array.length = 0` when overflowing. No new dependency needed.
- **Multi-page routing in emulator** — `react-router-dom` is already a dep (used for deck routes). Use nested `<Route>` definitions under `/emulator/*`.
- **Bridge message schema validation** — zod + the existing `wsMessageSchema` discriminated-union pattern in `protocol-internal.ts`. Add `serviceLogMessageSchema` as a new union member.
- **Hardware frame push** — the device transport in `outputClient/real.ts` already accepts frames; add a `pushRawImage(path)` helper rather than building a new pipeline.
- **Split-surface addon** — the codebase pattern is each surface = one button slot (`config/validation.ts` + `addon/api.ts` `ButtonDefinition.configSchema`). Mirror the legacy system-status with one surface per metric.

## Common Pitfalls

- **Splash on boot**: easy to forget that Playwright's startup takes 1-3s. The splash MUST be pushed via direct device call BEFORE `renderer.start()` in `outputClient/real.ts`. Don't go through the React frontend.
- **Shutdown black frame**: must push BEFORE the renderer tears down, otherwise the deck freezes on the last Playwright frame. Add it inside `outputHandle.stop()` BEFORE the existing teardown sequence.
- **Bridge-log ring buffer**: filtering must happen at render time, not at insert time, so switching filters doesn't lose data. All inserts go to the ring buffer regardless of active page.
- **Back-button onhold in split mode**: the current `splitAction` rule (`splitAtN1 && position === n1Position && type === "core:back"`) decides rendering. The onhold gesture must also fire `setOverlay(availableOverlayDeckId)` to navigate to the overlay layer — but only if an overlay deck is currently available, otherwise no-op.
- **Service-log WS message**: must use the existing bridge `broadcast` path (not a new WS connection). The `service-log` schema must be added to BOTH `packages/cli/src/api/protocol-internal.ts` AND the emulator's local protocol mirror in `packages/cli/emulator/src/bridge.ts`.
- **System-status rewrite**: don't preserve legacy surface helper APIs verbatim. Current addon architecture uses `AddonManifestV1` + `configSchema: zod`. Reimplement with the new pattern, not a compatibility shim.

## Existing Patterns in This Codebase

- **Back button gesture handler** at `packages/cli/src/deck/runtime.ts:332-373` (`handleSystemButton`). Current onhold is a no-op for `core:back`; needs extension to call `setOverlay(availableOverlayDeckId)`.
- **Split mode detection** at `packages/cli/frontend/src/components/Deck.tsx:254` (`splitAtN1 = deck.hasOverlayDeckAvailable === true`).
- **Emulator routes** at `packages/cli/emulator/src/App.tsx` — uses react-router for `/decks/:id`. Nested routes under `/emulator/*` would require restructuring.
- **Side panel** at `packages/cli/emulator/src/SidePanel.tsx` — currently shows a single device-selector. Needs to become a tabbed nav.
- **Bridge broadcast** at `packages/cli/src/render/ws-bridge.ts` — `broadcast(message)` available to all server-side publishers.
- **Bridge log capture**: NO existing pattern. Need new ring buffer store. Pattern candidate: `core/store.ts` (frontend pubsub), but emulator doesn't have an equivalent — will need new `emulator/src/bridge-log-store.ts`.
- **Hardware frame push** at `packages/cli/src/outputClient/real.ts` — `renderer` + `device` abstractions; need a new `pushRawImage` method on the transport.
- **Addon registry** at `packages/cli/src/addon/registry.ts` + `packages/cli/src/builtin-addons/` directory pattern. System-status lives here.

## Recommended Approach

- **Plan 01 — Hardware UX (Wave 1)**: Splash + shutdown black frame + back-button onhold. 3 small tasks grouped because they share the hardware transport layer.
- **Plan 02 — Service-log WS schema + CLI publish (Wave 1)**: Foundational WS message; small, blocks Plan 03.
- **Plan 03 — Emulator multi-page rework (Wave 2, depends on 02)**: Routes + ring buffer + 4 new pages + device-model fix.
- **Plan 04 — System-status addon (Wave 1)**: Rewrite addon + 4 split surfaces (cpu/ram/disk/net) at positions 0+5 in main deck.
