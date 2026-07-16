# Phase 4 Research: Settings Deck

## Existing Code

### Internal Settings Addon
- `packages/cli/src/builtin-addons/internal-settings/decks/settings.ts`: creates a settings deck with `brightness-up`, `brightness-down`, and `about` buttons. The brightness buttons use `methods.adjustBrightness({ direction: "up" | "down" })`. The about button currently has no action.
- `packages/cli/src/builtin-addons/internal-settings/backend.ts`: creates a `BrightnessProvider` using monitor brightness commands (`ddcutil`, `brightness`). This is the wrong provider for this phase.

### Device Brightness
- `packages/cli/src/device/stream-deck.ts`: `StreamDeckDevice` has `setBrightness(value: number)` and `brightness` property. The device uses Elgato's native brightness command.

### Output Clients
- `packages/cli/src/outputClient/real.ts`: wraps `StreamDeckDevice` and manages runtime.
- `packages/cli/src/outputClient/emulator.ts`: emulator client; no hardware brightness. We can store a fake brightness value in runtime state and emit it on a pub/sub channel.

### UI Surfaces
- `packages/cli/src/ui/surfaces/IconLabelSurface.tsx`: surface that renders an icon + label. Pattern for new surfaces: export a component, define a schema, register in `packages/cli/src/ui/surfaces/index.ts` (or wherever registry is).
- `packages/cli/src/ui/surfaces/index.ts`: surface registry.

### System Buttons
- `packages/cli/src/deck/system-buttons/registry.tsx`: maps button types to surfaces. `core:temporary-error` exists.
- System settings button is in the main deck as a generated system button.

### Runtime State / PubSub
- `packages/cli/src/deck/runtime.ts`: has `getBrightness()` and `setBrightness(value)`? Actually not yet. Need to add brightness state to runtime or use a pub/sub channel.
- `createMethods`: can publish/subscribe to channels.
- `createStore`: can store state.

## Decisions Needed

- The internal-settings brightness provider should be removed or left only if monitor brightness is a separate capability. This phase is about device brightness.
- Add brightness state to the runtime or store. Use `runtime.setBrightness()` / `runtime.getBrightness()` and a `runtime:brightness` pub/sub channel so the frontend can render the progress bar in emulator mode.
- New surface: `IconLabelProgressSurface` that accepts `icon`, `label`, `progress` (0-100), `visible`.
- Show/hide logic: show on tap; hide after timeout (e.g., 1500ms). The surface itself handles the hide timeout.
- Brightness button actions: dispatch a new method `adjustBrightness({ direction: "up" | "down" })`. In real mode, this calls `device.setBrightness`. In emulator mode, it mutates runtime state and publishes the new value.
- App info button: use `system:app-info` button type with `icon: "icon://info"` and `label: "Sireno v0.0.0"`.
- System settings button wiring: the main deck needs a `core:settings` system button at position n-2? Or make it an addon button? Actually, the system settings button already exists as part of the system buttons injection. Need to set its `target_deck` to the internal settings deck.

## Files to Change

- `packages/cli/src/builtin-addons/internal-settings/decks/settings.ts`: switch to new surfaces, remove about or repurpose it to app-info, use `adjustBrightness` action.
- `packages/cli/src/builtin-addons/internal-settings/backend.ts`: replace or remove monitor brightness provider; add `adjustBrightness` method to methods.
- `packages/cli/src/deck/methods.ts`: add `adjustBrightness({ direction })` method.
- `packages/cli/src/deck/runtime.ts`: add brightness state and pub/sub.
- `packages/cli/src/outputClient/real.ts`: wire `adjustBrightness` to `device.setBrightness`.
- `packages/cli/src/outputClient/emulator.ts`: wire `adjustBrightness` to runtime state and publish.
- `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx`: new surface.
- `packages/cli/src/ui/surfaces/index.ts`: register surface.
- `packages/cli/src/deck/system-buttons/registry.tsx`: register `core:settings` and `core:app-info` if needed.
- `packages/cli/src/deck/deck-config.ts` or `system-buttons/injection`: wire settings button target deck.
- `packages/cli/src/builtin-addons/internal-settings/frontend.tsx`: maybe not needed if surfaces are used.
- Tests: methods, runtime, settings deck, surface, output clients.

## Risks

- Stream Deck brightness values may be 0-100 or 0-255 depending on protocol. Need to check the device implementation. `setBrightness(value: number)` takes a number; let's assume 0-100.
- Brightness up/down increments need to be sensible (e.g., ±10%).
- The progress bar needs to hide automatically. If the user taps repeatedly, the timeout should reset.
- Emulator mode should still show the progress bar, so it needs a state channel.
- Need to make sure the existing `internal-settings` addon is not used elsewhere with monitor brightness expectations.
