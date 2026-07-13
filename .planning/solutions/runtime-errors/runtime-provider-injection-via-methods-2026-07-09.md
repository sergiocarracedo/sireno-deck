---
title: runtime.setClipboardProvider is not a function — dispose of methods before wiring providers
date: 2026-07-09
category: runtime-errors
module: cli/commands/run.ts
problem_type: runtime_error
severity: critical
tags:
  [
    provider-injection,
    methods-vs-runtime,
    discarded-destructure,
    test-fixture-mask,
    parallel-unwired-bug,
    esm,
  ]
---

# runtime.setClipboardProvider is not a function — dispose of methods before wiring providers

## Problem

On startup the CLI crashes with:

```
TypeError: runtime.setClipboardProvider is not a function
```

The user expected a refactor of `system/` providers; instead the symptom was a
latent bug that had been there since Phase 76 wired
`AddonServiceContext.setClipboardProvider`.

## Symptoms

- App fails to start when clipboard is enabled.
- `methods.keyMacro(...)` and `methods.pasteText(...)` throw `NotImplementedError`
  even though their providers are constructed — they were never injected.

## What Didn't Work

- Adding `setClipboardProvider: vi.fn()` to the fake `Runtime` in
  `cli/commands/__tests__/{run,start}.test.ts` makes the test pass while the
  production API surface stays wrong. The bug only surfaced via the real CLI.

## Solution

`createDeckRuntime` returns `{ runtime, methods, pubSub, store }`. The old
`run.ts` discarded `methods`:

```ts
const { runtime, methods, pubSub, store } = createDeckRuntime({ ... })
void methods
```

The fix has three parts.

1. **Pass `methods` through.** Thread it into `startSystemProviders` so the
   injectors can call the real API:

   ```ts
   const { runtime, methods, pubSub, store } = createDeckRuntime({
     decks,
     logger,
   })
   // pass methods into setup, don't discard
   ```

2. **Call the API that exists.** `setClipboardProvider` and `setKeyMacroProvider`
   live on `Methods` (`deck/methods.ts:51-52`), not on `Runtime`
   (`deck/runtime.ts:74` — only `setActiveAppProvider` and
   `stopActiveAppPolling`). `Runtime.setActiveAppProvider` stays on runtime
   because active-app polling is a runtime concern, not a methods concern.

   ```ts
   methods.setClipboardProvider(clipboard)
   methods.setKeyMacroProvider(keyMacro)
   runtime.setActiveAppProvider(activeApp)
   ```

3. **Delete the dead media provider** that `run.ts` was creating + stopping for
   no reason (`system/media/` was already unused; the media addon owns media
   control end-to-end).

This also fixed the parallel-unwired bug: `keyMacroProvider` was constructed
and held in `providers.keyMacro`, but never injected. The default
`MethodsContext.keyMacroProvider` is `undefined`, so the handler throws
`NotImplementedError("methods.keyMacro requires a keyMacroProvider...")`.

## Why This Works

The original `startSystemProviders` returned a `{setClipboardProvider}` arrow
that closed over `runtime`, then forwarded to `setupAddonServices` which then
forwarded through `bridgeAddonServices` into the addon `AddonServiceContext`.
Three hops, all referencing the wrong object. The fix collapses those hops:

- `methods.setClipboardProvider(...)` and `methods.setKeyMacroProvider(...)`
  direct-write the provider into `Methods`'s closure.
- `runtime.setActiveAppProvider(...)` keeps the polling-on-runtime invariant.

`MethodsContext.keyMacroProvider` / `clipboardProvider` are optional; defaulting
to `undefined` makes "the provider exists but was never injected" a hard
`NotImplementedError` at call time instead of a silent stub. The bug only
shows up under real wiring — test fixtures that augment the fake `Runtime`
hide it.

## Prevention

- **Test fixtures must match the real interface.** When a test adds
  `setClipboardProvider: vi.fn()` to `fakeRuntime`, it is hiding a missing API.
  Prefer typing `fakeRuntime` with the real `Runtime` interface and letting
  TypeScript point out the augmentation.
- **Inspect `void` discards in PRs.** A `void methods` immediately after a
  destructure is a code smell — either the value is needed, or the
  destructure should not include it.
- **Provider injection must close over the right handler.** When a service
  exposes both `setActiveAppProvider`-style wiring AND setter-via-context APIs,
  pick one and document the invariant. Here: providers consumed by handler
  methods live on `Methods`; providers consumed by runtime polling live on
  `Runtime`.
- **Dead code hides bugs.** `system/media/` was unused; clipboard and brightness
  imported `CommandExecutor` from `@/system/media` to keep the type reachable.
  When refactoring, follow the leaky chain to its source — the import would
  have broken the moment `system/media/` was deleted. (See commit `46cc102`
  which deletes `system/media/` and centralises `CommandExecutor` in
  `system/providers/shared.ts`.)

## Related

- `packages/cli/src/cli/commands/run.ts:284-289` — original `void methods`
- `packages/cli/src/deck/methods.ts:51-52` — `setKeyMacroProvider` /
  `setClipboardProvider`
- `packages/cli/src/deck/runtime.ts:74` — `setActiveAppProvider`
- `packages/cli/src/cli/commands/__tests__/run.test.ts:256`,
  `start.test.ts:264` — fixtures that masked the bug
- `packages/cli/src/system/providers/` — flattened provider tree (post-fix)
- `.planning/solutions/best-practices/output-client-solid-no-mode-branching-2026-07-09.md`
  — sibling refactor on the same pipeline
