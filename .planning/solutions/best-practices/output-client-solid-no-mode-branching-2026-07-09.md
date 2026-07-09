---
title: OutputClient SOLID — runner must not branch on implementation kind
date: 2026-07-09
category: best-practices
module: outputClient
problem_type: best_practice
severity: low
tags: solid, output-client, refactor, mode-branching, factory-pattern, device-descriptor, bridge-protocol, protocol-optionality
---

# OutputClient SOLID — runner must not branch on implementation kind

## Context

The `runPipeline` runner grew to ~270 lines with 4 explicit mode branches:
`if (!emulator) { ... listDevices ... }`, `if (device !== null) { ... real-mode wiring ... }`,
`if (emulator && outputHandle.emulatorUrl) { ... UX print ... }`,
and a `wsKeyCount` ternary for the bridge. Two implementations
(`RealOutputClient`, `EmulatorOutputClient`) shared ~80% of their bodies but
diverged only in the finalizer.

The seam was a factory function `selectOutputClient({emulator, device, intervalMs?})`
returning a `{start: (ctx) => OutputHandle}` shape — too narrow to push
device discovery, selection, persistence, or readiness checks inside the impl.

## Guidance

### 1. Push device discovery and selection into the impl

The OutputClient interface should own the full device lifecycle, not just the
finalizer. The runner only provides plumbing (bridge, runtime, decks, theme,
logger) and waits for `init()`.

```ts
// output-client/types.ts
export interface OutputClient {
  readonly kind: OutputKind  // kept for logging/debug, not control flow
  validateReady(): Promise<void>
  listDevices(): Promise<ReadonlyArray<DeviceDescriptor>>
  selectDevice(
    devices: ReadonlyArray<DeviceDescriptor>,
    savedId: string | null,
    logger: pino.Logger,
  ): Promise<DeviceDescriptor>
  storeSelection(descriptor: DeviceDescriptor): Promise<void>
  init(opts: InitOptions): Promise<OutputHandle>
}
```

Each impl decides what "devices" means:
- `RealOutputClient.listDevices()` enumerates `@elgato-stream-deck/node` hardware.
- `EmulatorOutputClient.listDevices()` returns a static virtual list
  (`emulator:mk2`, `emulator:xl`) — same shape, no real enumeration.

### 2. Move persistence and readiness into the impl

If the runner reads, writes, or validates any kind-specific state, it branches
on `kind`. Each of those belongs inside the impl:

- `storeSelection(descriptor)` — `RealOutputClient` calls `saveDeviceConfig(...)`;
  `EmulatorOutputClient` is a no-op (virtual devices don't persist).
- `validateReady()` — `RealOutputClient` lists devices and throws the friendly
  "No Stream Deck devices found..." error on empty; `EmulatorOutputClient`
  resolves immediately (virtual devices always exist).

The runner just calls them:

```ts
const outputClient = selectOutputClient({emulator, xdgConfigHome})
await outputClient.validateReady()
const devices = await outputClient.listDevices()
const descriptor = await outputClient.selectDevice(devices, savedId, logger)
await outputClient.storeSelection(descriptor)
const handle = await outputClient.init({bridge, runtime, ...})
```

`grep "kind" packages/cli/src/cli/commands/run.ts` returns zero hits — the
runner is mode-blind outside the factory call.

### 3. Make "in-flight" hello-ack fields optional

When a bridge protocol field is required but is only set after a side-effect
(e.g. `bridge.setDevice(...)`), clients that handshake before the side-effect
crash with a Zod error.

Make the field optional and conditionally spread it:

```ts
const ack = helloAckMessageSchema.parse({
  type: "hello-ack",
  version: PROTOCOL_VERSION,
  ...(currentDevice !== null ? { device: currentDevice } : {}),
  config: ...,
})
```

New clients after `setDevice()` get the device in hello-ack. Existing clients
receive it via a separate `device-info` broadcast — the bridge
`setDevice()` re-broadcasts to all OPEN clients.

### 4. Extend descriptors in-place at the seam, not via aliases

When `DeviceDescriptor` needs new fields (`keyCount`, `label`, `transport`),
extend the existing interface rather than creating a parallel type. The
blast radius is the cost; the alternative is a permanent translation layer
that drifts.

Pick names carefully:
- `serial` → `id` (the field always was an identifier; `serial` was a
  leak of the real-only implementation).
- `path` removed entirely (emulator has no path).
- `keyCount` resolved via `resolveKeyCount(model)` at construction.
- `transport: 'real' | 'emulated'` — discriminator, not a boolean.

## Why This Matters

A runner that branches on `kind` couples every change in one impl to the
runner file. Adding a third impl (network-attached Stream Deck, dual-device
control, a recording transport) meant touching the runner. After the
refactor, adding an impl is one new class file and one line in the factory.

The shape change also exposed a latent gap: emulator mode never started
system providers (clipboard, media, keyMacro, session) — real mode did.
With the shared pipeline, the gap closed as a side-effect.

## When to Apply

- Any time a runner/dispatcher has two or more `if (kind === ...)` branches
  whose only purpose is to invoke different implementations of the same
  conceptual step.
- When a factory function's argument list encodes implementation-specific
  state (e.g. `{emulator, device}`) — that state belongs inside the impl.
- When a bridge/protocol schema requires a field that's set by a side-effect
  later in the lifecycle — make it optional and broadcast updates.

## Examples

### Before — runner branches

```ts
if (!emulator) {
  const devices = await listDevices()
  const selection = await selectDevice({devices, ...})
  descriptor = selection.descriptor
  saveDeviceConfig({...})
  device = await connectStreamDeck({serial: descriptor.serial})
}

const wsKeyCount = descriptor !== null ? resolveKeyCount(descriptor.model) : 15
const bridge = await startWsBridge({port: 52937, keyCount: wsKeyCount})

if (device !== null) {
  bridge.onConnection((socket) => { /* 40 lines of real-mode wiring */ })
  // ... keyIndexToButtonId, gestureDetector, device.onKeyEvent, spawnFrontendVite
}

const outputClient = selectOutputClient({emulator, device, intervalMs})
const outputHandle = await outputClient.start(outputCtx)

if (emulator && outputHandle.emulatorUrl !== undefined) {
  logger.info({...}, "emulator mode ready")
  process.stdout.write(`\n  Emulator: ...`)
  openBrowser(outputHandle.emulatorUrl, logger)
}
```

### After — runner is mode-blind

```ts
const outputClient = selectOutputClient({emulator, xdgConfigHome})
await outputClient.validateReady()

const devices = await outputClient.listDevices()
const descriptor = await outputClient.selectDevice(devices, savedId, logger)
await outputClient.storeSelection(descriptor)

const handle = await outputClient.init({bridge, runtime, pubSub, store, decks, theme, themeDir, logger, addonByType, ...})

let resolveDone: () => void = () => undefined
const done = new Promise<void>((resolve) => { resolveDone = resolve })
const signals = options.signals ?? defaultSignals
const unregister = signals.onSignal(() => { logger.info("received signal, shutting down"); resolveDone() })

try {
  await done
} finally {
  unregister()
  // ... cleanup ...
  await Promise.allSettled([handle.stop(), ...])
}
```

## Prevention

- **Lint rule for mode-branching in runners.** A custom oxlint rule that
  flags `if (kind === ...)` or `if (emulator)` in files outside the impl
  module is the long-term answer. For now, grep `kind` / `emulator` in
  `cli/commands/run.ts` after every refactor — must return zero.
- **Interface parity check.** When adding a new OutputClient method, every
  impl must implement it. The vitest type-check step already catches this;
  add a runtime test that constructs every impl and verifies the method
  exists.
- **Schema conditional spread pattern.** Any time a protocol field is set
  by side-effect, use `{...(value !== null ? {field: value} : {})}` not
  `{field: value}` with `null` defaults — zod's `.optional()` accepts
  `undefined` but not `null`.

## Related

- `packages/cli/src/outputClient/types.ts` — the interface.
- `packages/cli/src/outputClient/real.ts` — `RealOutputClient` class.
- `packages/cli/src/outputClient/emulator.ts` — `EmulatorOutputClient` class.
- `packages/cli/src/render/ws-bridge.ts` — `setDevice()` + `device-info`
  broadcast.
- `packages/cli/src/api/protocol-internal.ts` — `helloAckMessageSchema`
  with optional `device`.
- `packages/cli/src/device/registry.ts` — `DeviceDescriptor` with
  `transport`.