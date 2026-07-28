---
title: Session-lock provider silently returns null when orchestrator omits required deps
date: 2026-07-27
category: docs/solutions/runtime-errors/
module: cli/src/system/providers/session
problem_type: runtime_error
component: development_workflow
severity: medium
symptoms:
  - "core:lock deck never renders when the OS session locks; lock UI is absent"
  - "loginctl lock-session produces no frontend response and no error"
  - "createSessionProvider resolves successfully but subscribe() never fires"
  - "runtime.isLockActive() stays false because the LockState subscriber is no-op"
  - "Linux idle-monitor fallback was also broken even when a dbus was eventually injected"
root_cause: incomplete_setup
resolution_type: code_fix
tags:
  - session-lock
  - dbus
  - idle-monitor
  - provider-pattern
  - null-object
  - linux
  - executor
  - core:lock
---

# Session-lock provider silently returns null when orchestrator omits required deps

## Problem

`runtime.setSessionProvider()` never received any lock-state events, so
`core:lock` (the dedicated lock deck) never rendered when the OS session
locked or the user went idle. The runtime's gesture suppression logic for
lock mode was already wired and tested — the failure was that the provider
chain was inert end-to-end.

## Symptoms

- `core:lock` never renders on `runtime:lock-mode` (`{active: true, reason: 'session-locked'}`).
- `loginctl lock-session` on GNOME/Wayland produces zero frontend response and emits no error.
- `createSessionProvider` resolves successfully (no throw) but the returned object's `subscribe()` is `noopUnsubscribe` — indistinguishable from a real provider at the type level.
- `runtime.isLockActive()` stays `false`; the orchestrator's `disconnectedSince` path is unaffected.
- The Linux provider had two nested bugs that compounded the issue even when a `dbus` was eventually injected.

## What Didn't Work

- Direct inspection suggested the wiring "looked right" — `runtime.setSessionProvider(session)` was being called, and the subscriber path was implemented. The bug only surfaced by tracing the **dependency graph** of `createSessionProvider`, not the call site.
- A test could have caught this: instantiate the factory with `{platform: 'linux', logger}` and assert the returned object either owns a bus connection or throws on missing deps. There was no such test.

## Solution

Three layers had to be repaired together; fixing only the orchestrator call would still have left the Linux provider broken.

### 1. Pass `executor` to `createSessionProvider` in `packages/cli/src/cli/commands/run.ts:968`

`executor` was already in scope (used by `createActiveAppProvider` and
`createKeyMacroProvider`) but accidentally omitted from the session call:

```ts
// BEFORE — executor omitted; darwin/win32 paths fell back to null provider too
const [activeApp, session, keyMacro] = await Promise.all([
  createActiveAppProvider({ platform, executor, logger }),
  createSessionProvider({ platform, logger }), // <-- broken
  createKeyMacroProvider({ platform, executor, env, logger, extraFsProbe }),
])

// AFTER
const [activeApp, session, keyMacro] = await Promise.all([
  createActiveAppProvider({ platform, executor, logger }),
  createSessionProvider({ platform, executor, logger }),
  createKeyMacroProvider({ platform, executor, env, logger, extraFsProbe }),
])
```

### 2. Self-own dbus via `sessionBus()` in `packages/cli/src/system/providers/session/linux.ts`

Mirrors `active-app/wayland-gnome.ts:62-74`. The orchestrator no longer has to
pre-wire a dbus bus instance — the provider opens its own when one isn't
injected:

```ts
import { sessionBus } from "dbus-next"

// ...

let bus: LinuxDbusBus | null = deps.dbus ?? null
if (bus === null) {
  try {
    bus = (await sessionBus()) as unknown as LinuxDbusBus
  } catch (err) {
    deps.logger.debug({ err }, "session: dbus sessionBus unavailable")
    return createNullSessionProvider(deps.logger)
  }
}
```

### 3. Fix the idle-monitor body — set `state = "locked"` and only fire on transition

The locked branch was assigning `"unlocked"` (a copy-paste / logic-inversion
bug), so the lock transition was never recorded:

```ts
// BEFORE — wrong state + no change-guard + bail-out on screensaver failure
try {
  const proxy = await bus.getProxyObject(SCREENSAVER_SERVICE, SCREENSAVER_PATH)
  // ...
} catch (err) {
  return createNullSessionProvider(deps.logger) // <-- over-eager: kills the idle fallback too
}

if (
  typeof idleMsRaw === "number" &&
  idleMsRaw > idleMs &&
  state === "unlocked"
) {
  state = "unlocked" // <-- bug: should be "locked"
  for (const l of listeners) l(state)
}

// AFTER — correct state, transition guard, fallback survives ScreenSaver init failure
let screensaverOk = false
try {
  const proxy = await bus.getProxyObject(SCREENSAVER_SERVICE, SCREENSAVER_PATH)
  // ... wire ActiveChanged ...
  screensaverOk = true
} catch (err) {
  deps.logger.debug({ err }, "session: ScreenSaver init failed")
  // ponytail: ScreenSaver can be unavailable on non-GNOME sessions; keep the
  // provider alive so the idle-monitor fallback can still fire.
}

if (!screensaverOk && !idleSupported) {
  deps.logger.debug("session: no lock source available, returning null")
  return createNullSessionProvider(deps.logger)
}

if (
  typeof idleMsRaw === "number" &&
  idleMsRaw > idleMs &&
  state === "unlocked"
) {
  state = "locked"
  for (const l of listeners) l(state)
}
```

## Why This Works

Root cause had three layers that masked each other:

1. **Factory layer.** `createSessionProvider` declared `dbus?` and `executor?` as optional. When undefined it returned `createNullSessionProvider`, whose `subscribe()` is `noopUnsubscribe` and whose `getState()` is `"unknown"`. The interface contract satisfied the call site — no throw, no explicit warning flag — so the failure looked like success. The orchestrator then passed `null` providers to `runtime.setSessionProvider`, which silently registered a no-op listener.

2. **Linux idle-monitor body.** Even with a bus connected, the locked branch assigned `"unlocked"` and fired redundant `"unlocked"` notifications to all listeners. The lock transition was never recorded; unlocking on wake would have fired another redundant `"unlocked"`.

3. **Linux ScreenSaver bail-out.** A single `catch` that returned `createNullSessionProvider` aborted the whole provider, so the idle-monitor fallback path was unreachable on non-GNOME sessions.

Fixes #1 and #2 break the silent-null chain at the factory. Fix #3 restores
the idle-monitor fallback. Fix #4 corrects the state machine inside that
fallback.

## Prevention

- **Fail fast for required deps.** Distinguish `readonly dbus: LinuxDbusBus` (required on linux) from `readonly dbus?: LinuxDbusBus` (optional) in `CreateSessionProviderOptions`, and throw a typed error rather than returning a null provider when a required dep is absent. The null provider should only be returned when the platform is genuinely unsupported or both detection probes fail.
- **Document self-ownership.** The `sessionBus()` self-owning pattern (already used in `active-app/wayland-gnome.ts:62-74`) is the canonical way to handle dbus in Linux providers. Callers should not be required to pre-wire dbus unless they have a specific bus instance to share.
- **Tests.** Add a vitest case that instantiates `createSessionProvider({ platform: 'linux', logger: silentLogger })` and asserts the returned object is _not_ the null provider (it should self-own a dbus connection). On darwin/win32, assert `executor` is required and passing `{}` throws or returns null with a warning.
- **Audit the same pattern in sibling providers.** `active-app/index.ts`, `clipboard/`, and any future `createXxx` provider need the same review. The "optional dep → silent null" trap recurs.
- **Manual verification.** Run `--emulator`, lock the screen via `loginctl lock-session` (GNOME/Wayland), confirm `core:lock` renders on `runtime:lock-mode`, and confirm unlock restores the prior deck via `runtime:activeDeck`.

## Related Issues

- `active-app/wayland-gnome.ts:62-74` — the self-owning dbus pattern this fix mirrors.
- `active-app/index.ts` — sibling provider with the same `dbus?: LinuxDbusBus` factory shape; same null-safety risk if all detection probes fail.
- `clipboard/`, `key-macro/` — same `createXxx` + optional-deps pattern; worth a focused audit to confirm the null provider is intentional, not a silently missing dep.
- `runtime.setSessionProvider` at `packages/cli/src/deck/runtime.ts:790` — wired correctly; the bug was upstream in the orchestrator and the linux provider body.
- `packages/cli/src/deck/__tests__/lock-deck.test.ts` — the existing tests cover the runtime-side gesture suppression under `lockActive` and were passing. Add a provider-side test there too to prevent recurrence.
