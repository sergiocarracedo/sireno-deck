---
title: Heartbeat deck-config rebroadcast freezes browser and drowns the WS bridge
date: 2026-07-31
last_updated: 2026-07-31
category: docs/solutions/runtime-errors/
module: cli/src/cli/commands/run.ts
problem_type: performance_regression
component: ws_bridge
severity: high
symptoms:
  - "Emulator browser tab freezes / becomes unresponsive after running --emulator for several seconds"
  - "WS handshake timeouts appear in daemon logs: 'ws: handshake timeout' every 5s + 32s gap"
  - "Memory grows unboundedly as deck-config rebroadcasts pile up"
  - "Frontend renders core:lock deck instead of main deck despite active session"
root_cause: unconditional_heartbeat
resolution_type: code_fix
related_commits:
  - a6ce8a4e # introduced: unconditional 1s heartbeat
  - 7ac15363 # fix(themes): idempotent loadThemeFromPath + subpath aliases (sibling commit)
tags:
  - heartbeat
  - deck-config
  - ws-bridge
  - browser-freeze
  - setInterval
  - performance
---

# Heartbeat deck-config rebroadcast freezes browser and drowns WS bridge

## Symptom

Running `--emulator` causes the browser tab to freeze after a few seconds.
The daemon logs show repeated WS handshake timeouts (`ws: handshake timeout`) at
a 5-second cadence with a 32-second gap — the old reconnect pattern — while the
bridge is simultaneously overwhelmed by rapid deck-config broadcasts.

## Root cause

Commit `a6ce8a4e` introduced a `setInterval` that broadcasts a full
`deck-config` to **all** connected WS clients every **1000 ms**, unconditionally,
even when nothing in the active deck has changed.

The frontend's `App.tsx` calls `navigate(/decks/${deckId}, {replace:true})` on
every `deck-config` message. With a 1s rebroadcast:

- Every tick forces a React Router navigation + re-render
- React StrictMode double-mounts compound the effect
- The emulator iframe's WS client is hit twice per second with a full state
  reconciliation
- The bridge's event loop is starved during the handshake window, causing
  genuine clients to time out and retry

## Fix

**File:** `packages/cli/src/cli/commands/run.ts`

```diff
  // ponytail: periodic heartbeat — ensures the frontend's overlay state
  // stays in sync after a transient disconnect or missed event. Fires every
- // 2s, cheap (one deck-config per cycle), and idempotent on the frontend.
+ // 2s, cheap (one deck-config per cycle), and idempotent on the frontend.
+ // Skip the broadcast when nothing observable changed since the last tick:
+ // an unconditional tick at 1s forced every client to re-render twice a
+ // second even with identical state, which drowned the emulator shell and
+ // starved the bridge's event loop during the 5s handshake window.
+ let lastHeartbeatKey = ""
  const heartbeat = setInterval(() => {
    const activeDeck = runtime.getActiveDeck()
    if (activeDeck === undefined) return
+   const key = [
+     activeDeck.id,
+     runtime.navStackDepth(),
+     runtime.hasOverlayDeckAvailable(),
+     runtime.getAvailableOverlayDeckIcon(),
+     runtime.getAvailableOverlayDeckName(),
+     isCompact,
+   ].join("|")
+   if (key === lastHeartbeatKey) return
+   lastHeartbeatKey = key
    const msg = buildDeckConfigMessage(...)
    bridge.broadcast(msg)
- }, 1000)
+ }, 2000)
```

- **State-key gate:** only rebroadcast when any observable field changes
  (`deck.id`, `navStackDepth`, `hasOverlayDeckAvailable`, overlay icon/name,
  `isCompact`).
- **Interval bump:** `1000 ms → 2000 ms` — the original comment said 2s but the
  code said 1s; 2s is sufficient for overlay sync and reduces bridge load.
- **Idempotent on frontend:** the frontend drops `replace:true` navigations to the
  same URL, so identical ticks cause zero visible effect even if a broadcast slips
  through.

## Related: session lock one-way state machine

The same commit also surfaced a latent bug in the Linux session provider's
idle-monitor fallback: it transitions `unlocked → locked` when idle time
exceeds threshold, but **never transitions back** when activity resumes. The
unlock only fires from the GNOME `ScreenSaver.ActiveChanged` signal.

If `org.gnome.ScreenSaver` is unavailable (non-GNOME desktop) and only
`org.gnome.Mutter.IdleMonitor` is available, once the session locks it stays
locked forever — causing `runtime.lockActive` to permanently force the
`core:lock` deck.

Fix in `packages/cli/src/system/providers/session/linux.ts`: add bidirectional
idle-monitor transitions:

```ts
if (typeof idleMsRaw === "number") {
  if (idleMsRaw > idleMs && state === "unlocked") {
    state = "locked"
    for (const l of listeners) l(state)
  } else if (idleMsRaw <= idleMs && state === "locked") {
    state = "unlocked"
    for (const l of listeners) l(state)
  }
}
```

See `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` for the
full session-provider fix history.

## Prevention

- **Never broadcast on a timer without a state-change guard** in a WS bridge.
  Use a dedup key or sequence-number check.
- **Set timers to match their comments** — the original 1s interval contradicted
  the 2s comment, masking the performance impact during code review.
- **Test rebroadcast suppression** — add a unit test asserting two identical ticks
  do not call `bridge.broadcast` twice.
