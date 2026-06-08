# Phase 53 Research — Brightness device control

**Phase:** 53 — Brightness device control
**Researched:** 2026-06-08
**Confidence:** HIGH (SDK signature verified against installed types; no new external dependencies; small surgical change to existing device module + new tiny module + new tiny addon)

## Don't Hand-Roll

- **The SDK signature is already verified.** The installed `@elgato-stream-deck/core@7.6.2/dist/types.d.ts` declares:
  ```ts
  /** Sets the brightness of the keys on the Stream Deck
   *  @param {number} percentage The percentage brightness */
  setBrightness(percentage: number): Promise<void>
  ```
  No 0-1 vs 0-100 ambiguity. The v1.5 research's MEDIUM-confidence concern is fully resolved. The wrapper accepts 0..100 from callers and passes through. [VERIFIED: `node_modules/.pnpm/@elgato-stream-deck+core@7.6.2/.../dist/types.d.ts`]

- **Don't write a debounced brightness controller.** Each `setBrightness` call is a synchronous USB HID write; spamming it (e.g. on every slider tick) can overwhelm the device. A future optimization is debouncing, but phase 53 is just the device layer — the button cycles 5 discrete values, no debouncing needed.

- **Don't reach into `connection.device` from outside the lifecycle closure.** The device handle's existing methods (`clearPanel`, `fillKeyBuffer`) all live inside the lifecycle closure. The new `setBrightness` follows the same pattern. Reaching in directly from the registry would create a parallel access path that bypasses the `lastBrightness` cache.

## Common Pitfalls

- **Stale `connection` after a USB reconnect.** The lifecycle holds a `connection` variable that gets reassigned in `onReconnect`. If `setBrightness` is called between disconnect and reconnect, the old `connection` is `null`. The implementation must check `connection` and throw a clear error (or wait, but throwing is simpler and matches the contract).
- **Registry leak in tests.** A `Set<StreamDeckDeviceHandle>` is module-singleton; tests that create handles will leak them across tests. The `_resetDeviceRegistryForTests()` export is required. Existing tests in `stream-deck.test.ts` need to be updated to call it in `beforeEach`.
- **Logging on every per-device failure in `setBrightnessAll`.** A multi-device setup (8+ devices) where one device is unplugged would spam the log. The `StreamDeckLogger.warn` call should be used, not `error` — failures are expected to be transient. A log-throttle is overkill for phase 53.
- **`lastBrightness` not re-applied on reconnect.** The lifecycle's `onReconnect` callback fires after a successful reconnect. The plan is to call `this.setBrightness(this.lastBrightness)` in `onReconnect` IF `lastBrightness !== undefined`. Forgetting this means a USB blip dims the device to the hardware default.
- **Adding `setBrightness` to `StreamDeckDeviceHandle` interface breaks existing test stubs.** Any test that constructs `{ clearPanel, close, fillKeyBuffer }` as a fake handle will fail to typecheck. The lifecycle closure itself is the only producer of real handles; tests that mock the handle (e.g. in `runtime.test.ts`) will need updating. Audit for stub handles before shipping.
- **The "future UI surfaces" wording hides scope creep.** v1.5 says future UI surfaces use the API; phase 53 is the device layer + a built-in brightness button. If a future user reads the phase 53 plan and assumes "all UI surfaces are in this phase", they could expand it. The CONTEXT.md scopes phase 53 to a fixed `brightness` button only; phase 54 (settings deck) is the larger UI surface.
- **The bundled-addon registration seam is fragile.** The existing addons (system-status, weather, etc.) are registered in a central index. The new `brightness` addon must be added to that same registration. Discovered during planning; not invented.

## Existing Patterns in This Codebase

- **`StreamDeckLogger` interface (`packages/cli/src/device/stream-deck.ts:43-48`).** The registry's `setBrightnessAll` accepts an optional `StreamDeckLogger` and uses `logger.warn(...)` for per-device failures. This matches the existing `reconnect` warning pattern at `stream-deck.ts:?` (uses `logger.warn({ error, model, serialNumber }, ...)`).
- **`noopLogger` fallback.** The lifecycle uses a noop logger when no logger is provided. The registry follows the same pattern.
- **Handle closure pattern.** The lifecycle's `clearPanel` and `fillKeyBuffer` are arrow functions inside the `createStreamDeckLifecycle` factory. They capture `connection` and other private state. The new `setBrightness` follows the same pattern. The private `lastBrightness` is a field on the closure (not a Map keyed by handle — there's only one lifecycle per process).
- **Addon pattern.** `packages/cli/src/builtin-addons/system-status/` is the template for a new built-in addon. It has `index.ts` (entry), `domain/` (data layer), `buttons/` (button definitions + components + tests), `schemas.ts` (zod config), `index.test.ts` (smoke tests). The new `brightness` addon follows the same shape, simpler (no domain/ — it's just a button + surface).
- **`useButtonActionCommand` in addon API.** Existing addons use this for `tap`, `hold`, `double-tap` commands. The new `brightness` button's `onTap` handler doesn't need commands — it just calls `setBrightnessAll` directly. Simpler than the system-status pattern.
- **`renderReactNodeToHtml` test helper.** The brightness addon's surface test uses this to assert the rendered HTML.
- **Addon registration seam.** The bundled-addon registration is in `packages/cli/src/builtin-addons/registry.ts` or equivalent (discovered during planning). The new `brightness` addon is registered there.

## Recommended Approach

### File-level changes

1. **`packages/cli/src/device/registry.ts` (NEW)** — `openHandles` Set, `registerDeviceHandle`, `unregisterDeviceHandle`, `getOpenDeviceHandles`, `setBrightnessAll`, `SetBrightnessResult`, `_resetDeviceRegistryForTests`. ~50 lines.
2. **`packages/cli/src/device/stream-deck.ts` (MODIFY)** — add `setBrightness: (percentage: number) => Promise<void>` to the `StreamDeckDeviceHandle` interface; implement on the lifecycle closure; add `let lastBrightness: number | undefined` private state; re-apply on reconnect via `onReconnect`; call `registerDeviceHandle` / `unregisterDeviceHandle` at connect/close.
3. **`packages/cli/src/device/registry.test.ts` (NEW)** — 6+ tests for the registry + `setBrightnessAll` happy / partial-failure / total-failure paths.
4. **`packages/cli/src/device/stream-deck.test.ts` (MODIFY)** — 3+ new tests for `setBrightness`; reset registry in `beforeEach`.
5. **`packages/cli/src/builtin-addons/brightness/index.ts` (NEW)** — addon entry. Exports a `builtinBrightnessAddon` with `apiVersion: 1`, `name: 'brightness'`, and a single button definition.
6. **`packages/cli/src/builtin-addons/brightness/buttons/brightness.tsx` (NEW)** — the `brightness` button definition using `defineMountedButton`. `onTap` increments the cycle, calls `setBrightnessAll`, updates the store.
7. **`packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.tsx` (NEW)** — renders the current percentage (e.g. "50%") centered, with a small subtitle showing the next value.
8. **`packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.test.tsx` (NEW)** — surface tests.
9. **`packages/cli/src/builtin-addons/brightness/index.test.ts` (NEW)** — smoke test that the addon is registered with the right name and apiVersion.
10. **Bundled addon registration** — wherever existing built-in addons are registered, add the new `brightness` addon.

### Wave plan (vertical slices)

- **Plan 53-01 (wave 1):** Device layer — `registry.ts` + `stream-deck.ts` `setBrightness` + reconnect persistence + tests. Tracer bullet: a unit test of `setBrightnessAll(50)` with two mocked handles (one succeeds, one throws) returns the right summary and the registry tracks the surviving handle.
- **Plan 53-02 (wave 2, depends on 53-01):** Brightness button — new built-in addon with a `brightness` button type that cycles 0/25/50/75/100 on tap and calls `setBrightnessAll`. Tracer bullet: a deck with a `brightness` button shows the current percentage; tapping increments and calls `setBrightnessAll`.

Both plans are demoable independently. 53-01 is pure device-layer (unit tests + mock handles). 53-02 is the first real consumer and exercises the API in production.

### Vertical slice integrity

- 53-01: after it completes, `setBrightnessAll(50)` can be called and demonstrably behaves correctly (succeeds, fails per-device, returns summary). Demoable via the unit test.
- 53-02: after it completes, a user adds a `brightness` button to a deck, sees the percentage, and tapping cycles through the values. Demoable via the render-level test.

### Build order

1. Implement the registry (wave 1, task 1).
2. Add `setBrightness` to the device handle and lifecycle closure (wave 1, task 2).
3. Add reconnect persistence (wave 1, task 3).
4. Add the `brightness` addon with the button + surface (wave 2, task 1).
5. Register the addon in the bundled-addon index (wave 2, task 2).

## Open Considerations (not blocking, capture in plan)

- **The lifecycle has a single `connection` per instance.** If the user opens a second Stream Deck later (via the lifecycle's reconnect logic), the same lifecycle handles it. The registry's `set` is keyed by handle, so two devices in the same process still have two entries. Confirmed by reading `createStreamDeckLifecycle`.
- **`setBrightnessAll` is called from the bright addon's `onTap` handler.** The handler doesn't await it (it could take 100ms+ to write to a slow USB device). The handler updates the store immediately, then fires off the brightness write in the background. Future enhancement: await + show a notification on partial failure.

## References

- 53-CONTEXT.md — locked decisions
- v1.5 research/SUMMARY.md — flagged the SDK signature concern (now resolved)
- `packages/cli/src/device/stream-deck.ts` — the device module to extend
- `packages/cli/src/builtin-addons/system-status/` — reference pattern for a built-in addon
- `node_modules/.pnpm/@elgato-stream-deck+core@7.6.2/.../dist/types.d.ts` — the SDK signature
- 53-RESEARCH.md (this file) — research synthesis

---

*Research complete: 2026-06-08*
*Next: plan-phase 53*
