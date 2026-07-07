# Plan 17-08 — Media Poller Consolidation

## Gap

Two parallel poller paths for media:

### Path A (new, **dead**)
`builtin-addons/media/index.ts:46-79` — `globalBackend.pollers[]` array with a `poll` function. This is **never consumed**: the bridge only calls `onLoad` and reads `methods`. The `publish` from `globalBackend.onLoad` writes to the bridge's local `pubSub` which goes to `StatePublisher` — but that only subscribes to pollers discovered via `discoverAddonPollers()` (path B).

### Path B (legacy, **active in emulator mode**)
`builtin-addons/media/poller.ts` — loaded via `addon.pollerEntry` by `discoverAddonPollers()` in `addon-registry.ts:296-317`. Only runs in emulator mode. Uses the old `MediaProvider` from `@/system/media` (not the new `MediaStatusProvider`).

### Path C (new, **partially wired**)
`builtin-addons/media/index.ts` `globalBackend.onLoad` (lines 132-184) — initializes `MediaStatusProvider` from `providers/`, calls `startWatching(onChange)` which calls `ctx.publish(state)`. This writes to the bridge's local pubsub. But the pubsub → `StatePublisher` → WS → frontend path is broken because `StatePublisher` only subscribes to polllers from `discoverAddonPollers()`.

## Goal

Single `media:state` channel. `globalBackend` owns the provider lifecycle and pushes state via `ctx.publish`. No dual paths.

## Changes

### `builtin-addons/media/index.ts` — Consolidate

1. **Delete** the `globalBackend.pollers` block (lines 46-79). This is dead.
2. **Keep** `globalBackend.methods` (lines 81-130) — these are called by the button backends.
3. **Keep** `globalBackend.onLoad` (lines 132-184) but fix the `ctx.publish` path.

**The `ctx.publish(state)` problem:** `ctx.publish` in `AddonBackendContext` is `(data: unknown) => void` — no channel argument. Looking at the bridge at `addon-handler-bridge.ts:71`:
```ts
publish: (data: unknown) => pubSub.publish(`addon:${addonName}`, data),
```

So `ctx.publish(state)` publishes to channel `addon:media`. But the frontend subscribes to `media:state`. The media addon publishes to `addon:media` which is never subscribed to.

**Fix:** Use `publish` from `AddonButtonBackendContext` (not `AddonBackendContext`). The per-button `publish(channel, data)` at `addon-handler-bridge.ts:148`:
```ts
publish: (channel: string, data: unknown) => pubSub.publish(channel, data),
```

The `globalBackend.onLoad` only gets `AddonBackendContext` (no `publish` with channel). **Decision needed: either extend `AddonBackendContext` to include a channel-aware `publish`, or handle state publishing differently.**

**Alternative:** Keep `startWatching` in `globalBackend.onLoad` but call `ctx.publish` only for internal state, and rely on the `media/poller.ts` path (which runs via `discoverAddonPollers`) for frontend state. This preserves the dual path but assigns distinct roles.

**Chosen approach:** Extend `AddonBackendContext` to add `publishState(channel, data)` alongside `publish(data)`. Bridge passes both. `globalBackend.onLoad` uses `ctx.publishState("media:state", state)`. Frontend subscribes to `media:state`.

### Delete `builtin-addons/media/poller.ts`

Consolidate to single path. The old provider is no longer needed.

### `builtin-addons/media/providers/`

Keep all providers (linux, darwin, windows, types, index). These are consumed by `globalBackend.onLoad` via `createMediaProvider`.

### Update `builtin-addons/media/index.ts`

```ts
// globalBackend becomes:
const globalBackend: AddonGlobalBackend = {
  methods: {
    play: async () => { await provider?.play() },
    pause: async () => { await provider?.pause() },
    toggle: async () => { await provider?.toggle() },
    next: async () => { await provider?.next() },
    previous: async () => { await provider?.previous() },
    setVolume: async (...args) => {
      const value = typeof args[0] === "number" ? args[0] : 1
      await provider?.setVolume(value)
    },
    volumeUp: async (...args) => {
      const step = typeof args[0] === "number" ? args[0] : 0.05
      await provider?.volumeUp(step)
    },
    volumeDown: async (...args) => {
      const step = typeof args[0] === "number" ? args[0] : 0.05
      await provider?.volumeDown(step)
    },
    toggleMute: async () => { await provider?.toggleMute() },
  },
  onLoad: (ctx) => {
    // ...provider initialization...
    // Use ctx.publishState("media:state", state) when extended
  },
}
```

## Files

- `packages/cli/src/builtin-addons/media/index.ts` — remove dead pollers, fix state publishing
- `packages/cli/src/builtin-addons/media/poller.ts` — delete
- `packages/cli/src/addon/api.ts` — extend `AddonBackendContext` with `publishState`
- `packages/cli/src/deck/addon-handler-bridge.ts` — pass `publishState` in `AddonBackendContext`

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

## Note on `media:state` Channel

Single `media:state` channel carries full `MediaPlayerState`:
```ts
interface MediaPlayerState {
  title: string | null
  artist: string | null
  isPlaying: boolean
  volume: number
  canGoNext: boolean
  canGoPrev: boolean
  source: string | null
  status: "play" | "pause" | "stop" | null
  progress: number
  time: string
  muted: boolean
}
```

Each button frontend (`media-player`, `media-mute`, `media-volume`) reads the fields it needs via `useAddonChannel<MediaPlayerState>("media:state")`.
