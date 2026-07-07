# Plan 17-10 — Bridge Context: `core:*` Runtime Methods + Brightness Fix

## Gap 1 — Runtime Methods Not Exposed to Per-Button Backends

Per-button backends in `core-buttons` need to call runtime methods (`invalidate`, `navigateToDeck`, `runCommand`, `goBack`, `getActiveDeckId`). Currently these are only available on the runtime's own `Methods` object (`deck/methods.ts`), not passed to addon backends via `ctx.methods`.

The bridge (`addon-handler-bridge.ts:106-110`) only copies `globalBackend.methods` (namespaced as `<addonName>:*`). Runtime built-ins are missing.

## Fix — Inject `core:*` Namespace in Bridge

At `addon-handler-bridge.ts:106-110`, add a `coreMethods` map and merge it:

```ts
// At bridge line ~106
const globalMethods = addonMethods.get(addonName) ?? {}

// core runtime methods available to every addon
const coreMethods: Record<string, AddonBackendMethod> = {
  "core:invalidate": () => runtime.invalidate(),
  "core:navigateToDeck": (args: { id: string; addToHistory?: boolean }) =>
    runtime.navigateToDeck(args.id, { addToHistory: args.addToHistory }),
  "core:goBack": () => runtime.goBack(),
  "core:getActiveDeckId": () => runtime.getActiveDeckId(),
  "core:runCommand": async (command: string, options?: ActionExecutorOptions) =>
    executor.run(command, options),
}

const buttonMethods: Record<string, AddonBackendMethod> = {
  ...coreMethods,
  ...Object.fromEntries(
    Object.entries(globalMethods).map(([k, v]) => [`${addonName}:${k}`, v]),
  ),
}
```

Now every addon backend can call:
- `ctx.methods["core:invalidate"]?.()`
- `ctx.methods["core:navigateToDeck"]?.({ id: "my-deck", addToHistory: true })`
- `ctx.methods["core:goBack"]?.()`
- `ctx.methods["core:getActiveDeckId"]?.()`
- `ctx.methods["core:runCommand"]?.("my-command", { cwd: "/tmp" })`

This resolves Plan 03's `toggle` backend needing `invalidate` and Plan 03's `change-deck` backend needing `navigateToDeck`.

## Gap 2 — Brightness Uses `hostContext.exec` Which Bridge Never Sets

`builtin-addons/brightness/buttons/brightness/backend.ts:23-26`:

```ts
const exec = hostContext["exec"] as
  | ((cmd: string, args: string[]) => Promise<{ exitCode: number; stderr: string }>)
  | undefined
if (!exec) return  // always undefined!
```

After Plan 04, `hostContext` no longer exists in `AddonButtonBackendContext`. The brightness backend must use `ctx.executor` instead:

```ts
// Before:
const exec = hostContext["exec"] as (...)

const platform = (globalThis as {...}).process?.platform as NodeJS.Platform | undefined
if (platform === undefined || !isMacOS(platform)) return
const cmd = buildMacOSCommand(cfg)
void exec(cmd[0], cmd.slice(1))

// After:
const platform = (globalThis as {...}).process?.platform as NodeJS.Platform | undefined
if (platform === undefined || !isMacOS(platform)) return
const cmd = buildMacOSCommand(cfg)
void ctx.executor.run(cmd[0], cmd.slice(1))
```

Note: `ActionExecutor.run(command: string, options?)` takes a single command string (not array). The old `exec` took `(cmd, args[])`. `buildMacOSCommand` returns a command string.

## Files

- `packages/cli/src/deck/addon-handler-bridge.ts` — inject `core:*` methods
- `packages/cli/src/builtin-addons/brightness/buttons/brightness/backend.ts` — use `ctx.executor`

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

## Risk

Low — straightforward code additions and replacements.
