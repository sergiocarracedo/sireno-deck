# Plan 17-05 — Dead Code Removal: `pollers` and `subscriptions` Fields

## Gap

`AddonGlobalBackend` in `addon/api.ts` (lines 200–223) defines `pollers?: ReadonlyArray<AddonGlobalPoller>` and `subscriptions?: ReadonlyArray<AddonGlobalSubscription>`. The doc comment says these are "started when the addon activates", but **no code consumes them**.

- `pollers` array on `globalBackend` is never read by the bridge.
- The only poller discovery path is `discoverAddonPollers()` in `addon-registry.ts:296-317`, which loads `poller.ts` files via `addon.pollerEntry`.
- Media's `globalBackend.pollers` (index.ts lines 46-79) is dead code.

## Changes

### `addon/api.ts`

Delete from `AddonGlobalBackend` interface:
```ts
readonly pollers?: ReadonlyArray<AddonGlobalPoller>
readonly subscriptions?: ReadonlyArray<AddonGlobalSubscription>
```

Delete the associated type definitions:
```ts
export interface AddonGlobalPoller {
  readonly channel: string
  readonly intervalMs: number
  readonly poll: (ctx: AddonBackendContext) => unknown | Promise<unknown>
}

export interface AddonGlobalSubscription {
  readonly channel: string
  readonly subscribe: (
    ctx: AddonBackendContext,
  ) => { unsubscribe: () => void }
}
```

Also update the doc comment on `AddonGlobalBackend` to remove the reference to pollers/subscriptions.

### `addon/api.ts` — Keep `AddonBackendContext` Fields

The `AddonBackendContext` interface is used by:
- Bridge: `publish` (local pubsub), `signal`, `executor`
- `media/index.ts globalBackend.onLoad` uses all three

Do **not** delete these. Only delete the top-level `pollers`/`subscriptions` on `AddonGlobalBackend`.

## Files

- `packages/cli/src/addon/api.ts`

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

## Risk

Low — these fields are confirmed dead (zero consumers in the codebase).
