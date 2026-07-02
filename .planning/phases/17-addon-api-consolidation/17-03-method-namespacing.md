# Plan 17-03 — Method Namespacing Fix

## Gap

`addon-handler-bridge.ts:108-110` prefixes all global backend methods with `<addonName>:`. But three addons' backends use **unprefixed** method keys, so `ctx.methods["runCommand"]` is always `undefined` at runtime:

### `core-buttons/buttons/action/backend.ts`
```ts
// BROKEN: expects methods.runCommand (unprefixed)
// The bridge passes: methods["core-buttons:runCommand"]
await methods.runCommand(config.command, {...})
```

### `core-buttons/buttons/toggle/backend.ts`
```ts
// BROKEN: expects methods.invalidate (unprefixed)
methods.invalidate()
```

### `core-buttons/buttons/change-deck/backend.ts`
```ts
// BROKEN: expects methods.navigateToDeck (unprefixed)
methods.navigateToDeck({ id: config.deck, addToHistory: config.addToHistory })
```

### `emoji-selector/buttons/launcher/backend.ts`
```ts
// BROKEN: expects methods["navigate-deck"] (unprefixed, kebab-case)
void methods["navigate-deck"]?.("emoji")
```

### `emoji-selector/buttons/back/backend.ts`
```ts
// BROKEN: same issue
void methods["navigate-deck"]?.("main")
```

## Changes

### `core-buttons/buttons/action/backend.ts`

```ts
// Before:
await methods.runCommand(config.command, {...})

// After:
await methods["core:runCommand"]?.(config.command, {
  ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
  ...(config.env !== undefined ? { env: config.env } : {}),
})
```

### `core-buttons/buttons/toggle/backend.ts`

After Plan 10 (bridge injects `core:invalidate`), this becomes:

```ts
onTap: async ({ config, methods }) => {
  const scope = store.buttonScope<boolean>("core-buttons", config.key)
  const current = scope.get("value") ?? config.default
  scope.set("value", !current)
  await methods["core:invalidate"]?.()
}
```

Note: `store` is no longer in `AddonButtonBackendContext`. After Plan 04, the bridge passes `{ config, buttonId, addonName, methods, publish, executor, signal }` — no `store`. The toggle backend needs to use `ctx.publish("core-buttons:toggle", ...)` or another mechanism. **Decision needed before executing Plan 03.**

### `core-buttons/buttons/change-deck/backend.ts`

```ts
// After (with core: namespace):
await methods["core:navigateToDeck"]?.({ id: config.deck, addToHistory: config.addToHistory })
```

### `emoji-selector/buttons/launcher/backend.ts`

```ts
// After (namespaced + underscore):
void methods["emoji-selector:navigate-deck"]?.("emoji")
```

### `emoji-selector/buttons/back/backend.ts`

```ts
void methods["emoji-selector:navigate-deck"]?.("main")
```

### Note on `emoji-selector:navigate-deck`

The emoji-selector addon has **no global backend** (`globalBackendEntry` is null in scanned addons), so there is no `emoji-selector:navigate-deck` method registered. The emoji-selector buttons call a method that doesn't exist.

**This means Plan 03 will fail at runtime unless Plan 10 (bridge injects `core:navigateToDeck`) is also done first, OR the emoji-selector addon gets a global backend that registers `navigate-deck`.**

Given the existing bridge code at `addon-handler-bridge.ts:106-110` only reads `globalBackend.methods`, the emoji-selector's `navigate-deck` calls are dead code unless we also add a global backend to emoji-selector (or plan 10 injects `core:navigateToDeck`).

**Execution order: Plan 03 must run after Plan 10.** Update phase execution order.

## Files

- `packages/cli/src/builtin-addons/core-buttons/buttons/action/backend.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle/backend.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck/backend.ts`
- `packages/cli/src/builtin-addons/emoji-selector/buttons/launcher/backend.ts`
- `packages/cli/src/builtin-addons/emoji-selector/buttons/back/backend.ts`

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```
