---
title: n-1 system button was always injected at startup, even when the OS session was locked
date: 2026-08-06
last_updated: 2026-08-06
category: docs/solutions/runtime-errors/
module: cli/src/cli/commands/run.ts
problem_type: runtime_error
component: orchestrator
severity: medium
symptoms:
  - "n-1 button (back/settings-entry/overlay-toggle) is present in the deck structure when the OS session is locked"
  - "the wire-level filter (`buildDeckConfigMessage` strips n-1 when `lockActive`) hides it from the frontend, but the source-level structure is stale"
  - "any consumer that reads `runtime.getActiveDeck().buttons` directly (e.g. tests, addon hand-off, hot-reload) sees the n-1 button even when locked"
  - "session provider fires `runtime:lock-mode` AFTER the initial injection, so the n-1 button sticks around until the next lock transition or full restart"
root_cause: incomplete_state_plumbing
resolution_type: code_fix
tags:
  - n-1-system-button
  - session-lock
  - injectSystemButtons
  - computeSystemButtonForSlotN1
  - lockActive
  - sourceDecks
  - deck-injection
  - runtime-active-deck
  - pubsub
  - run-pipeline
---

# n-1 system button was always injected at startup, even when the OS session was locked

## Problem

The n-1 system button (back on non-main decks, settings-entry on main,
overlay-toggle on overlay decks) was being injected into the deck structure
at startup, regardless of whether the OS session was locked. The wire-level
filter `buildDeckConfigMessage` strips the n-1 button when `lockActive: true`
(see `packages/cli/src/deck/deck-config.ts:125-131`), so the frontend never
saw it — but the **source** of truth (the runtime's internal `decks` array)
still had the n-1 button baked in. Any consumer that reads the runtime's
decks directly (addon handoff, hot-reload, tests) saw the stale n-1.

The existing `computeSystemButtonForSlotN1` already had a `lockActive` guard
returning `null` for all three deck kinds (main, overlay, regular) — the
function was ready, the **orchestrator** just never passed `lockActive:
true` to it at startup.

## Symptoms

- `runtime.getActiveDeck().buttons` includes the n-1 button when the OS
  session is locked at startup.
- Wire-level `deck-config` messages correctly strip the n-1 button (the
  filter does its job), but the source-level shape is wrong.
- After `runtime:lock-mode` fires, the runtime re-routes the active deck to
  `core:lock`, but the user-configured decks still have the n-1 button in
  their internal representation.
- Hot-reload via `rebuildDecksForKeyCount` calls `buildRuntime(...)` without
  `lockActive`, so the rebuild also bakes the n-1 button in.

## What Didn't Work

- Patching `injectSystemButtons` to strip pre-existing n-1 buttons when
  `lockActive: true`. The function is "inject" — it only adds, not strips.
  Forcing it to strip would conflate two responsibilities and break the
  existing idempotency guarantee (`is idempotent when n-1 is already a
system button`).
- Adding a startup-only `lockActive` parameter that doesn't survive a keyCount
  rebuild or config hot-reload. The lock state can change at any time, so the
  knob has to be re-evaluated on every transition.
- Skipping the re-injection entirely and relying solely on the wire-level
  filter. The filter is correct for the frontend, but the source-level
  structure is consulted by `runtime.getActiveDeck()`, the dedup subscriber
  in `setupAddonServices`, addon handoff, and tests. The source has to be
  honest.

## Solution

Two layers:

1. **`buildRuntime` accepts `lockActive` and returns `sourceDecks`** (the
   pre-injection decks). The orchestrator keeps the source-level decks so
   it can re-inject on lock state change without re-running
   `materializeAddonDecks` (which is expensive and would re-paginate).

2. **Re-inject on every lock transition** in `runPipeline`, after the
   session provider is wired but before `setupAddonServices` is called. The
   re-injection subscribes to `runtime:lock-mode` and forces a fresh
   `bridge.broadcast` to bypass the deck-id-equality dedup in the bridge
   subscriber.

### 1. `buildRuntime` signature and `sourceDecks` field

```ts
// packages/cli/src/cli/commands/run.ts:405-419
interface LoadConfigAndThemeResult {
  // ...
  readonly sourceDecks: ReadonlyArray<RuntimeDeck> // ponytail: pre-injection decks
  // ...
}

// packages/cli/src/cli/commands/run.ts:648-652
const buildRuntime = (
  options: RunOptions,
  loaded: LoadConfigResult,
  keyCount: number,
  lockActive: boolean = false, // NEW: defaults to false for back-compat
): LoadConfigAndThemeResult => {
  // ...
  const sourceDecks = materializeAddonDecks(/* ... */)
  const allDecsWithSystemButtons = injectSystemButtons(sourceDecks, keyCount, {
    lockActive, // pass through to computeSystemButtonForSlotN1
  })
  // ...
  return { /* ..., */ decks: allDecks, sourceDecks /* ... */ }
}
```

The `runtime` and `pubSub` are also returned so the orchestrator can re-inject
and broadcast later without re-entering `buildRuntime`.

### 2. Re-injection in `runPipeline`

```ts
// packages/cli/src/cli/commands/run.ts:1411-1465 (after resolverOptions)
const reInjectedDecks = (isLocked: boolean): ReadonlyArray<RuntimeDeck> =>
  injectSystemButtons(loaded.sourceDecks, descriptor.keyCount, {
    lockActive: isLocked,
  })
const broadcastActiveDeck = (): void => {
  const activeDeck = runtime.getActiveDeck()
  if (activeDeck === undefined) return
  const msg = buildDeckConfigMessage(
    activeDeck, addonBundle.addonByType, resolverOptions,
    /* ... */,
    { lockActive: runtime.isLockActive() },
  )
  bridge.broadcast(msg)
}
if (providers.session.getState() === "locked") {
  const reInjected = reInjectedDecks(true)
  runtime.setDecks(reInjected)
  decks = reInjected
  broadcastActiveDeck()
}
let unsubscribeLockMode: (() => void) | null = pubSub.subscribe(
  "runtime:lock-mode",
  (payload) => {
    const isLocked =
      typeof payload === "object" &&
      payload !== null &&
      (payload as { active?: unknown }).active === true
    const reInjected = reInjectedDecks(isLocked)
    runtime.setDecks(reInjected)
    decks = reInjected
    // ponytail: runtime:setDecks publishes runtime:activeDeck, but the
    // deck-id-equality dedup in the bridge subscriber skips the
    // re-broadcast when the active deck id is unchanged. Force a fresh
    // broadcast so the wire filter sees the lock state on the new decks.
    broadcastActiveDeck()
  },
)
```

Three things to note:

- **Initial re-injection is gated on `session.getState() === "locked"`.**
  On most boots the session is `"unknown"` at startup and the provider
  fires `"locked"` shortly after via `runtime:lock-mode`. The initial
  re-injection is a best-effort for the (rare) case where the OS is locked
  at the moment the daemon starts.
- **The re-injection updates the outer `decks` variable.** `setupAddonServices`
  captures `decks` in its closure, but the wire-level filter in
  `buildDeckConfigMessage` strips the n-1 button from the captured decks
  regardless, so the broadcast is correct. The outer `decks` update is for
  correctness in the `rebuildDecksForKeyCount` and hot-reload paths.
- **The `broadcastActiveDeck` helper bypasses the dedup.** The
  `runtime:activeDeck` subscriber in `setupAddonServices` dedups by `lastBroadcastedDeckId`.
  When the active deck id doesn't change (e.g. we re-inject from `"main"`
  to `"main"` with no n-1 button), the subscriber would skip the broadcast.
  Forcing the broadcast directly via `bridge.broadcast` ensures the wire
  filter sees the lock state on the new decks.

### 3. Plumbing through `rebuildDecksForKeyCount` and config hot-reload

Both call sites of `buildRuntime` now pass `lockActive` based on the session
state:

```ts
// rebuildDecksForKeyCount callback (run.ts:1551)
rebuildDecksForKeyCount: (keyCount: number) =>
  buildRuntime(
    options, loadedConfig, keyCount,
    providers?.session.getState() === "locked",
  ).decks,

// config hot-reload (run.ts:1685)
const rebuilt = buildRuntime(
  options, nextLoaded, descriptor.keyCount,
  providers?.session.getState() === "locked",
).decks
```

The `providers?.session` lookup is safe because `providers` is nulled out
after `dispose()` in the cleanup, and both call sites run inside the
lifetime of `providers`.

### 4. Cleanup

`unsubscribeLockMode` is declared alongside the other cleanup variables
(`let unsubscribeLockMode: (() => void) | null = null` at `run.ts:1366`) so
the `finally` block can call it. The `finally` block now includes:

```ts
if (unsubscribeLockMode !== null) unsubscribeLockMode()
```

## Why This Works

The chain has three layers — source-level injection, runtime state, and
wire-level filter — and the bug was that the source-level injection only
ran once (at startup), before the session provider existed. The fix:

1. **Plumbs `lockActive` through `buildRuntime`** so the source-level
   injection can be honest from the first frame.
2. **Keeps `sourceDecks` in the result** so the orchestrator can re-inject
   cheaply on every lock transition without re-paginating.
3. **Subscribes to `runtime:lock-mode`** so the source stays correct on
   every transition, not just at startup.
4. **Forces a broadcast** so the wire-level filter sees the lock state on
   the new decks, even when the deck id doesn't change.

The wire-level filter is unchanged — it still strips the n-1 button when
`lockActive: true`. The source-level fix is purely additive: the runtime's
internal decks now reflect the truth instead of trusting the filter to
hide the discrepancy.

## Prevention

- **Test the source-level structure, not just the wire.** The wire-level
  filter masked the source-level bug for an unknown period. A test that
  reads `runtime.getActiveDeck().buttons` directly after a lock transition
  would have caught this. The new
  `packages/cli/src/deck/__tests__/system-back-injection.test.ts` tests
  cover `computeSystemButtonForSlotN1` and `injectSystemButtons` with
  `lockActive: true`, but the wiring (session → re-inject → broadcast) is
  still only validated by manual emulator runs. Add a `runPipeline` test
  that mocks `providers.session.getState()` to return `"locked"` and
  asserts `runtime.getActiveDeck().buttons` has no n-1 button.
- **Audit every `buildRuntime` caller.** The default `lockActive: false`
  is intentional for back-compat, but every caller must be audited to
  decide whether to pass the session's lock state. A `lockActive:
providers?.session.getState() === "locked"` is correct for the
  `rebuildDecksForKeyCount` and hot-reload paths; the initial call stays
  at the default because the session re-injection block below handles
  the locked-at-startup case.
- **The `runtime:lock-mode` pubsub is the canonical event for lock
  transitions.** Do not poll `session.getState()` from a timer — it
  misses the transition edge and the runtime will silently route to
  `core:lock` without re-injecting.

## Related Code

- `packages/cli/src/deck/system-back-injection.ts:30` — the existing
  `lockActive` guard on `computeSystemButtonForSlotN1` that this fix
  finally wires up.
- `packages/cli/src/deck/deck-config.ts:125-131` — the wire-level filter
  that masks the source-level bug.
- `packages/cli/src/deck/runtime/runtime.ts:259-272` — `enterLockMode`
  and the `runtime:lock-mode` publish + `runtime:activeDeck` re-route.
- `packages/cli/src/deck/__tests__/system-back-injection.test.ts` —
  load-bearing regression tests for `lockActive: true` on all three
  deck kinds.
- `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` —
  the previous session-lock fix; together they close the lock-state
  plumbing end-to-end.
