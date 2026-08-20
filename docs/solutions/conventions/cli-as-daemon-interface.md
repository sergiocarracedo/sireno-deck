---
title: "CLI-as-daemon-interface: readiness probes, event surfacing, and URL display"
date: 2026-08-20
category: conventions
module: packages/cli
problem_type: convention
component: cli
severity: medium
applies_when:
  - "Making the CLI the operator's interface to a forked daemon"
  - "Surfacing daemon logs inline from the CLI after start/restart/stop"
  - "Showing the daemon's URL after startup completes"
tags:
  - cli
  - daemon
  - readiness
  - pino
  - log-reader
  - runtime-state
related_components:
  - packages/cli/src/cli/startup-display.ts
  - packages/cli/src/util/log-reader.ts
  - packages/cli/src/util/daemon.ts
---

# CLI-as-daemon-interface: readiness probes, event surfacing, and URL display

## Context

The CLI (`pnpm dev start`, `pnpm dev restart`, `pnpm dev stop`) is the
operator's full interface to the daemon. After forking, the daemon runs
independently — the CLI must wait for it to be fully ready before
reporting success, surface any warnings/errors the daemon emitted during
startup inline, and show the emulator URL so the operator knows where to
point their browser.

The naive approach (fork the daemon, print "started", exit) leaves the
operator blind: they don't know if the daemon actually came up, they
don't see warnings that appeared during boot, and they have to dig into
`service.log` to find the URL.

## Guidance

### 1. Snapshot + diff for daemon log events

Use a snapshot-and-diff model to surface daemon log events inline:

1. **Before** the daemon operation (start/restart/stop), snapshot the
   `service.log` file size: `snapshotDaemonLog()`.
2. **After** the operation completes, read the bytes appended since the
   snapshot: `readDaemonEventsFromSnapshot(logPath, snapshot)`.
3. Filter to warn/error/fatal (pino levels 40/50/60) and print each
   event as a colored bullet.

```ts
import { snapshotDaemonLog, readDaemonEventsFromSnapshot } from "@/util/log-reader"

const logPath = join(resolveDaemonPaths().runtimeDir, "service.log")
const snapshot = snapshotDaemonLog()

await start(options)

const events = readDaemonEventsFromSnapshot(logPath, snapshot)
printDaemonEvents(events)
```

This is simpler and more reliable than tail-polling: you only see events
that accumulated during the operator's command, not the entire log
history. If the file was rotated (truncated), the snapshot detects the
size shrunk and returns empty — no stale events from a previous daemon.

### 2. Composite readiness probe

Don't rely on just TCP port acceptance. Use a two-stage probe:

1. **TCP**: wait for the daemon's WS port (default 52937) to accept a
   connection — confirms the process is alive and the WS server started.
2. **Runtime state**: wait for `runtime-state.json` to be written —
   confirms the daemon's full pipeline (WS bridge + vite supervisors)
   came up.

```ts
const tcpReady = await checkTcp("127.0.0.1", port, timeoutMs)
if (tcpReady) {
  const state = await waitForRuntimeState(runtimeTimeoutMs)
  // state !== null → fully ready
}
```

TCP opens *before* `runtime-state.json` is written (the WS server
binds before the vite supervisors stabilize). If you only check TCP,
you'll report "started" while vite is still booting, and the operator
will see "loading…" in the emulator iframe.

### 3. Fail loudly on timeout

The CLI must not silently exit 0 when the daemon fails to start. On
timeout:

```ts
if (!tcpReady) {
  const message = `daemon: port ${port} did not accept connections in 30s`
  logger.warn(message)
  process.exitCode = 1
  printStartupFailed(message)
  return
}
```

The operator needs to know the daemon failed — they can then run
`p dev logs` to see what went wrong.

### 4. Show URLs for both local and remote modes

After startup, show the emulator URL. For `--remote`, also show LAN
addresses with QR codes (TTY) or plain URLs (pipe).

```ts
printDaemonUrl(state)
```

The URL includes the auth token (regenerated per session), so the
operator can copy-paste it directly.

### 5. Confirm port release after stop

After killing the daemon, confirm the WS port is genuinely free:

```ts
const portFree = await waitForPortFree(port, timeoutMs)
printStopComplete(portFree)
```

If the port is still bound (TIME_WAIT, orphan vite), surface that as a
warning — the operator will need to investigate before restarting.

## Why This Matters

- The CLI is the only interface operators have. If it doesn't wait for
  readiness, operators see "loading…" in the emulator and don't know if
  the daemon is still booting or permanently broken.
- If the CLI doesn't surface log events inline, operators miss warnings
  (e.g., "vite didn't respond to SIGTERM within 5s") and have to dig
  into `service.log` to diagnose issues.
- If the CLI doesn't show the URL, operators have to grep the log or
  re-run start to recall where to point their browser.
- If the CLI doesn't confirm port release after stop, the next `start`
  may fail with "port in use" and the operator won't know why.

## When to Apply

- Making any CLI command the operator's interface to a forked daemon.
- Any time a daemon writes a log file that the CLI should surface.
- Any time the CLI needs to confirm a daemon reached full readiness
  (not just forked successfully).

## Examples

**Before** (fire-and-forget, operator blind):

```ts
await start(options)
printStartupComplete()
await startPromise
```

**After** (waits for readiness, surfaces events, shows URL):

```ts
const logSnapshot = snapshotDaemonLog()
const logPath = join(resolveDaemonPaths().runtimeDir, "service.log")
const startPromise = start(options)
const outcome = await waitForFullStart({ port, logPath, logSnapshot })
printDaemonEvents(outcome.events)
if (outcome.runtimeReady && outcome.state !== null) {
  printDaemonUrl(outcome.state)
  printStartupComplete()
} else {
  process.exitCode = 1
  printStartupFailed(outcome.tcpReady ? "runtime state timeout" : "TCP timeout")
}
await startPromise
```

## Related

- PR #24 — fix(cli): wait for daemon readiness and surface events inline
- `packages/cli/src/util/log-reader.ts` — daemon event reader
- `packages/cli/src/cli/startup-display.ts` — readiness helpers and
  display functions
