# Phase 53 CONTEXT — Brightness device control

**Phase:** 53 — Brightness device control
**Discussed:** 2026-06-08
**Status:** locked — proceed to plan-phase 53

## Domain

The Stream Deck's hardware brightness is currently not exposed to addons or the daemon UI. This phase adds a `setBrightness(percentage)` method to the device handle, a `setBrightnessAll` helper that iterates every open device, and a built-in brightness button (as a sanity-check UI surface that exercises the registry in production). Phase 54 (Settings deck) will be the larger consumer; this phase provides the device-layer foundation.

## Locked decisions

### Device registry: new `device/registry.ts` module

A new singleton module at `packages/cli/src/device/registry.ts` tracks every open `StreamDeckDeviceHandle`:

```ts
let openHandles = new Set<StreamDeckDeviceHandle>()

export function registerDeviceHandle(handle: StreamDeckDeviceHandle): void {
  openHandles.add(handle)
}
export function unregisterDeviceHandle(handle: StreamDeckDeviceHandle): void {
  openHandles.delete(handle)
}
export function getOpenDeviceHandles(): readonly StreamDeckDeviceHandle[] {
  return [...openHandles]
}
export function _resetDeviceRegistryForTests(): void {
  openHandles = new Set()
}
```

`setBrightnessAll(percentage)` is exported from the same module and iterates `getOpenDeviceHandles()`:

```ts
export interface SetBrightnessResult {
  succeeded: number
  failed: number
  errors: string[]
}

export async function setBrightnessAll(percentage: number, logger?: StreamDeckLogger): Promise<SetBrightnessResult> {
  const result: SetBrightnessResult = { succeeded: 0, failed: 0, errors: [] }
  for (const handle of getOpenDeviceHandles()) {
    try {
      await handle.setBrightness(percentage)
      result.succeeded += 1
    } catch (error) {
      result.failed += 1
      result.errors.push(error instanceof Error ? error.message : String(error))
      logger?.warn({ error, percentage }, 'setBrightnessAll: device failed')
    }
  }
  return result
}
```

The lifecycle factory `createStreamDeckLifecycle` calls `registerDeviceHandle(connection)` on successful connect and `unregisterDeviceHandle(connection)` on close. Existing tests in `stream-deck.test.ts` are updated to call `_resetDeviceRegistryForTests()` in `beforeEach`.

### `StreamDeckDeviceHandle.setBrightness(percentage)`

Add to the existing `StreamDeckDeviceHandle` interface:

```ts
export interface StreamDeckDeviceHandle {
  clearPanel: () => Promise<void>
  close: () => Promise<void>
  fillKeyBuffer: (keyIndex: number, imageBuffer: Uint8Array, options?: { format?: string }) => Promise<void>
  setBrightness: (percentage: number) => Promise<void>
}
```

The implementation in the lifecycle factory:

```ts
async setBrightness(percentage: number): Promise<void> {
  if (percentage < 0 || percentage > 100 || !Number.isFinite(percentage)) {
    throw new RangeError(`setBrightness: percentage must be 0..100, received ${percentage}`)
  }
  if (connection?.device) {
    await connection.device.setBrightness(percentage)
  } else {
    throw new Error('setBrightness: device is not connected')
  }
  this.lastBrightness = percentage
}
```

The `lastBrightness` private field is added to the closure class and re-applied in the `onReconnect` callback (if the device reconnects after a USB blip, the new connection gets the last known brightness). This satisfies "persisted on the handle for reconnect".

### SDK signature: v7.6.2 confirmed

The installed `@elgato-stream-deck/node` is v7.6.2. The underlying `@elgato-stream-deck/core` v7.6.2 `types.d.ts` declares:

```ts
setBrightness(percentage: number): Promise<void>
```

JSDoc says: `@param {number} percentage The percentage brightness`. So the wrapper takes 0-100 directly; no 0-1 conversion needed. The v6 (0-1) vs v7 (0-100) concern from the v1.5 research is resolved.

### Brightness persistence: in-memory only

`lastBrightness: number` is a private field on the handle closure. It's lost on daemon restart. Matches the ROADMAP's "persists for the session" wording. Re-apply on reconnect via `onReconnect` (the existing callback is the right seam — it runs after a successful reconnect and has access to `connection`).

### Error handling: log + continue; return summary

`setBrightnessAll` catches per-device errors, logs each via the optional `StreamDeckLogger`, and continues. Returns a `SetBrightnessResult` summary so callers can surface the partial-failure state. Matches the ROADMAP's "failures on individual devices are logged but do not abort the pass".

The summary is a structured return value, not a thrown exception. Callers (e.g. the future phase 54 settings deck) can decide what to do — show a notification, retry, or just continue.

### Built-in brightness button: yes, in a new addon

A new built-in `brightness` addon is shipped at `packages/cli/src/builtin-addons/brightness/`:

- Provides a single `brightness` button type.
- The button renders a fixed-size `BrightnessSurface` component that shows the current percentage (e.g. "50%") and a small `+/-` chip pattern.
- The button's `onTap` cycles through discrete values: 0, 25, 50, 75, 100 (each tap increments by 25, wrapping around). On tap, the addon calls `setBrightnessAll(percentage)` and updates its store with the new value.
- Polling: the addon polls `getOpenDeviceHandles().length` every 5 seconds to detect new devices / disconnects; the percentage itself is in-memory and stable across the session.
- The addon is registered in `packages/cli/src/builtin-addons/registry.ts` (or whatever the bundled-addon registration seam is) and shipped alongside the other built-in addons.

The button is NOT a config-driven UI like the system-status bars — it's a fixed, recognisable control. The user adds it to a deck by `type: 'brightness'` in their config.

## Specifics

### Test plan

- `registry.test.ts` (NEW): tests for `registerDeviceHandle`, `unregisterDeviceHandle`, `getOpenDeviceHandles`, `_resetDeviceRegistryForTests`, `setBrightnessAll` (happy path, partial failure, total failure).
- `stream-deck.test.ts` (MODIFY): add tests for the new `setBrightness` method on the device handle (happy path, out-of-range, no connection). Update existing tests to call `_resetDeviceRegistryForTests()` in `beforeEach` so the registry doesn't leak between tests.
- `brightness/index.test.ts` (NEW): render-level test that the brightness button shows the current percentage, that tapping increments it, and that `setBrightnessAll` is called with the new value.

### File-level changes

1. **`packages/cli/src/device/registry.ts` (NEW)** — `openHandles` Set, `registerDeviceHandle`, `unregisterDeviceHandle`, `getOpenDeviceHandles`, `setBrightnessAll`, `SetBrightnessResult`, `_resetDeviceRegistryForTests`.
2. **`packages/cli/src/device/stream-deck.ts` (MODIFY)** — add `setBrightness: (percentage: number) => Promise<void>` to the `StreamDeckDeviceHandle` interface; implement on the lifecycle class; track `lastBrightness`; re-apply on reconnect; call `registerDeviceHandle` / `unregisterDeviceHandle` at connect/close.
3. **`packages/cli/src/device/registry.test.ts` (NEW)** — 6+ tests.
4. **`packages/cli/src/device/stream-deck.test.ts` (MODIFY)** — 3+ new tests; reset registry in `beforeEach`.
5. **`packages/cli/src/builtin-addons/brightness/index.ts` (NEW)** — addon entry point.
6. **`packages/cli/src/builtin-addons/brightness/buttons/brightness.tsx` (NEW)** — the `brightness` button definition.
7. **`packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.tsx` (NEW)** — the surface component.
8. **`packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.test.tsx` (NEW)** — surface tests.
9. **`packages/cli/src/builtin-addons/brightness/index.test.ts` (NEW)** — addon integration tests.
10. **Bundled addon registration** — wherever existing built-in addons (system-status, weather, etc.) are registered, add the new `brightness` addon.

### Wave plan (vertical slices)

- **Plan 53-01 (wave 1):** Device layer — `registry.ts` + `stream-deck.ts` `setBrightness` + reconnect persistence + tests. Tracer bullet: `setBrightnessAll(50)` with two mocked handles succeeds, logs and continues on one failure, returns the right summary.
- **Plan 53-02 (wave 2, depends on 53-01):** Brightness button — new built-in addon with a `brightness` button type that cycles 0/25/50/75/100 on tap and calls `setBrightnessAll`. Tracer bullet: a deck with a `brightness` button shows the current percentage; tapping increments and calls `setBrightnessAll`.

Both plans are demoable independently. 53-01 is pure device-layer (unit tests + mock handles). 53-02 is the first real consumer and exercises the API in production.

## Canonical refs

- `packages/cli/src/device/stream-deck.ts` (the device module to extend; 545 lines).
- `packages/cli/src/device/registry.ts` (NEW — the new registry).
- `node_modules/.pnpm/@elgato-stream-deck+core@7.6.2/node_modules/@elgato-stream-deck/core/dist/types.d.ts` (the SDK signature: `setBrightness(percentage: number): Promise<void>`).
- `packages/cli/src/builtin-addons/system-status/` (reference pattern for a built-in addon).
- `packages/cli/src/builtin-addons/registry.ts` or equivalent (the bundled-addon registration seam — discover during planning).

## Existing code insights

### Reusable assets

- `StreamDeckLogger` interface (lines 43-48 of `stream-deck.ts`) — already accepts `warn` and `error`. The registry's `setBrightnessAll` accepts an optional `StreamDeckLogger` and uses `logger.warn(...)` for per-device failures.
- `onReconnect` callback in `StreamDeckLifecycleOptions` (line 60) — the right seam to re-apply `lastBrightness` after a USB reconnect.
- `StreamDeckDeviceInfo['model']` and `['serialNumber']` — already in the disconnect log context. The registry can use these as Set keys if we want to dedupe per (model, serial) — but the Set holds handle references, so identity-based dedupe is fine.

### Established patterns

- The existing `clearPanel` method on the handle does a `.catch(() => undefined)` to suppress errors at the call site. The new `setBrightness` does NOT do that — errors propagate, the registry's `setBrightnessAll` catches them.
- The existing `noopLogger` (line ~50 of `stream-deck.ts`) is the fallback when no logger is provided. The registry uses the same pattern: optional logger, noop if absent.
- The existing addon pattern (`packages/cli/src/builtin-addons/system-status/`) is the template for the new `brightness` addon.

### Integration points

- `createStreamDeckLifecycle` (line 345 of `stream-deck.ts`) is where the new `setBrightness` method is implemented. The handle closure is the same as `clearPanel` (line 286) and `fillKeyBuffer` (line 292).
- The bundled-addon registration is the only top-level integration point for the new `brightness` addon. Discovered during planning.
- The runtime doesn't need changes — the new addon plugs in like any other.

## Verification anchors

- A `setBrightnessAll(50)` test with two mock handles: one succeeds, one throws → returns `{ succeeded: 1, failed: 1, errors: ['mock error'] }`.
- A `setBrightness(150)` test throws `RangeError`.
- A `setBrightness(50)` test on a disconnected handle throws `Error('device is not connected')`.
- A registry test: register 2 handles, unregister 1, `getOpenDeviceHandles()` returns 1.
- A brightness-button test: tap once from default 50% → 75% (or 25%, depending on initial) and `setBrightnessAll` is called with that value.
- A reconnect test: `lastBrightness = 75` is set, the handle is closed, a new handle is created in `onReconnect` → the new handle's `setBrightness(75)` is called.

## Deferred ideas

- **Per-brightness profiles per app** (e.g. dim when OBS is recording) — not in scope; would be a follow-up phase.
- **Brightness up/down on the system back button** — the v1.5 prompt mentions this is part of the settings deck (phase 54). Captured there.
- **A CLI subcommand for brightness** — deferred; not in v1.5.
- **Cross-session brightness persistence** — deferred; current scope is session-only.
- **An LED backlight control** (a different hardware feature) — out of scope; not asked for.

---

*CONTEXT locked: 2026-06-08*
*Next: plan-phase 53*
