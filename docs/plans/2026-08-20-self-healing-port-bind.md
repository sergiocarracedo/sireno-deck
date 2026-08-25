---
plan_contract: ce-plan/v1
product_contract_source: ce-plan-bootstrap
artifact_readiness: implementation-ready
created: 2026-08-20
---

# Self-healing `p dev start` against EADDRINUSE + frontend vite crash

## Problem Frame

Two related crashes from the user's session:

1. **WS-bridge port collision**: A previous `sirenodeck:dm` daemon (pid 1724313) from an earlier `p dev start` is still bound to 52937 (and 3939). The new daemon tries to bind 52937 → EADDRINUSE → `runPipeline` rejects → CLI shows `TCP bound on 52937 but runtime state did not appear in 5s`.

2. **Frontend vite startup fails on first try**: When the daemon does manage to bind ports, the first vite subprocess often exits because of `@tailwindcss/vite`'s pre-transform error (`Can't resolve 'sireno-deck-theme'`). Vite eventually recovers on retry, but the supervisor currently treats the first exit as fatal.

`killPortListeners` (start.ts:263) handles orphan vites but NOT orphan daemons. The pid file check (`readPid`) only catches the case where the daemon wrote a clean pid file — not the case where the daemon was killed via SIGKILL and the pid file is stale or missing.

## Goal Capsule

`p dev start --emulator` should succeed end-to-end without manual cleanup, even when a previous daemon's processes are still bound to the daemon ports. Specifically:

1. Detect processes bound to the daemon ports that match our identity (the `sirenodeck:dm` process title) and kill them.
2. Detect orphan vite children from any sireno-deck checkout (already works; verify coverage).
3. Make the frontend vite supervisor treat transient startup errors (e.g., the `sireno-deck-theme` resolve error on first compile) as recoverable rather than fatal.

## Scope

**In scope:**

- Add a daemon-identity check to `killPortListeners` so it can also reap previous-session daemons
- Use `/proc/<pid>/comm` or `cmdline` to identify `sirenodeck:dm` processes as ours
- Soften the frontend vite supervisor's `exited after becoming ready` path so transient first-startup errors don't kill the daemon
- Add e2e tests that simulate the stale-daemon scenario

**Out of scope:**

- Production daemon recovery (this is dev-mode only — the systemd unit has its own restart policy)
- New commands for `p dev cleanup` or similar (the self-healing IS the fix)
- Detecting processes from other sireno-deck checkouts that aren't us (cmdline pattern stays narrow)

## Key Decisions

### KTD-1: Identify previous-session daemons by process title, not by pid file

**Decision:** Extend `port-identity.ts` with an `isOurDaemon(pid)` helper that matches `/proc/<pid>/comm` against `sirenodeck:dm` (Linux-only). The helper also cross-checks the cmdline to confirm the process was started from a sireno-deck checkout (not just any binary named `sirenodeck:dm`).

**Rationale:** The pid file is the primary source of truth for "is there a daemon running" but it's stale-prone (SIGKILL'd daemons leave the pid file behind). `process.title` (`comm` on Linux) is set by the daemon to `sirenodeck:dm` via `setProcessTitle` in main.ts:23. So checking `comm` against `sirenodeck:dm` is reliable.

**Governs:** `packages/cli/src/cli/commands/port-identity.ts`, `packages/cli/src/cli/commands/start.ts:263`

### KTD-2: `killPortListeners` sends SIGTERM to identified daemons before SIGTERM to vites

**Decision:** New helper `reapStaleDaemon(logger)` that finds pids holding the WS port (52937) with `comm === 'sirenodeck:dm'` and SIGTERMs them, then SIGKILL after 3s. Called before `killPortListeners` so the WS port is free by the time the new daemon's preflight runs.

**Rationale:** `killPortListeners` only kills vite children. The daemon itself owns 52937 (WS bridge) and 3939 (HTTP server) and is invisible to the existing helper. Adding a daemon-reap step before the vite-reap step closes the gap.

**Governs:** `packages/cli/src/cli/commands/start.ts` new helper

### KTD-3: Frontend vite supervisor treats "exited during startup" as recoverable

**Decision:** The frontend vite supervisor (subprocess-supervisor.ts) currently emits a FATAL on any "exited after becoming ready" event. Change the threshold: only FATAL if the vite child has been alive and serving for at least N seconds before exiting. If it exits within the first N seconds (e.g., 10s), log a WARN and let the supervisor restart it instead of failing the daemon.

**Rationale:** Vite's first compile can take a few seconds (especially when the Tailwind plugin does dependency optimization). On slow boxes or when a CSS plugin like `@tailwindcss/vite:generate:serve` emits a pre-transform error on the first request, vite may restart itself. Treating the first-N-seconds exit as fatal makes the daemon unusable for a transient startup issue.

**Governs:** `packages/cli/src/cli/commands/subprocess-supervisor.ts`

### KTD-4: Bound the kill — never SIGKILL a process the user is running

**Decision:** The new daemon-reap step only sends SIGTERM/SIGKILL to processes matching BOTH `comm === 'sirenodeck:dm'` AND a sireno-deck cmdline pattern (e.g., the entry path is `bin/sirenodeck.js` from a sireno-deck checkout). Anything else holding 52937 (a Discord voice call, a Chrome debugger, the user's `nc -l`) gets left alone with a clear error.

**Rationale:** Conservative. The identity gate has to be tight enough that we never accidentally kill an unrelated process holding the port. The existing vite check (`cmdlineMentionsCliRoot`) is a good template.

**Governs:** `port-identity.ts`, new `reapStaleDaemon` helper

## Implementation Units

### IU-1: Add `isOurDaemon` to port-identity.ts

**File:** `packages/cli/src/cli/commands/port-identity.ts`

```typescript
export const isOurDaemon = (pid: number): boolean => {
  if (process.platform !== "linux") return false
  // Read /proc/<pid>/comm — the process title. The daemon calls
  // setProcessTitle("sirenodeck:dm") in main.ts; supervisors reset it.
  try {
    const comm = readFileSync(`/proc/${pid}/comm`, "utf8").trim()
    if (comm !== "sirenodeck:dm") return false
  } catch {
    return false
  }
  // Confirm cmdline mentions sireno-deck — guards against a hypothetical
  // future where a non-sireno-deck process is named "sirenodeck:dm" by its
  // supervisor.
  const cmdline = readProcCmdline(pid) ?? ""
  return /sireno[-_]?deck/.test(cmdline)
}
```

**Ponytail:** /proc is the native source — no `which ps` or external commands.

### IU-2: Add `reapStaleDaemon` and call it before `killPortListeners`

**File:** `packages/cli/src/cli/commands/start.ts`

```typescript
const reapStaleDaemon = async (
  wsPort: number,
  logger: pino.Logger,
): Promise<void> => {
  const pids = detectPortPids(wsPort, logger)
  for (const pid of pids) {
    if (!isOurDaemon(pid)) {
      logger.warn(
        { pid, port: wsPort },
        "start: WS port held by a process that is NOT a sireno-deck daemon — leaving it alone",
      )
      continue
    }
    try {
      process.kill(pid, "SIGTERM")
      logger.warn(
        { pid, port: wsPort },
        "start: SIGTERM to stale daemon (WS port conflict)",
      )
    } catch (err) {
      logger.warn({ err, pid }, "start: SIGTERM to stale daemon failed")
    }
  }
  // Wait for SIGTERM to take effect, then SIGKILL stragglers
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100))
    const stillBound = detectPortPids(wsPort, logger)
    if (stillBound.length === 0) break
  }
  for (const pid of detectPortPids(wsPort, logger)) {
    if (isOurDaemon(pid)) {
      try {
        process.kill(pid, "SIGKILL")
      } catch {
        /* already dead */
      }
    }
  }
}
```

Called in `start()` at line 765, BEFORE `killPortListeners`. The WS port (52937) is the load-bearing one; if the daemon is gone, the vites are gone (they get reparented to init and `killPortListeners` reaps them).

### IU-3: Soften frontend vite supervisor for startup-window exits

**File:** `packages/cli/src/cli/commands/subprocess-supervisor.ts`

Find the "exited after becoming ready" FATAL. Look at the supervisor's restart logic: if the child has been alive for less than `STARTUP_GRACE_MS` (default 10s), treat the exit as a startup error and let the supervisor restart it. Only mark FATAL if the child had been alive long enough to have served requests.

If the existing supervisor already has restart logic, this becomes a threshold check on `childSpawnedAt`. If not, this IU introduces the restart path.

### IU-4: Tests for port-bind awareness

**File:** `packages/cli/src/cli/commands/__tests__/port-self-heal.test.ts` (new)

Tests:

- `isOurDaemon` returns true when `comm === "sirenodeck:dm"` and cmdline matches
- `isOurDaemon` returns false when comm doesn't match
- `isOurDaemon` returns false when comm matches but cmdline doesn't (supervisor named it that way)
- `reapStaleDaemon` SIGTERMs only identified daemons, not other processes holding the port

Use `vi.mock("node:fs", ...)` to mock /proc reads — same pattern as `port-detection.test.ts`.

### IU-5: e2e verification

Run `p dev start --emulator` from a state where:

- /run/user/1000/sireno-deck.pid is MISSING (or has a dead pid)
- An orphaned `sirenodeck:dm` process (from a previous session) is bound to 52937

Verify:

- The orphan daemon is killed
- The new daemon binds 52937 cleanly
- runtime-state.json appears within 5s
- The banner prints with addon checks
- `✓ Sireno Deck started`

Also test: while the daemon is running, kill it (`kill -9 <pid>`), run `p dev start` again, verify self-heal picks up the missing-pid + occupied-port combo.

## Files to Create/Modify

**Modify:**

- `packages/cli/src/cli/commands/port-identity.ts` — add `isOurDaemon`
- `packages/cli/src/cli/commands/start.ts` — add `reapStaleDaemon`, call before `killPortListeners`
- `packages/cli/src/cli/commands/subprocess-supervisor.ts` — soften startup-window FATAL

**Create:**

- `packages/cli/src/cli/commands/__tests__/port-self-heal.test.ts` — unit tests

## Risks

- **`comm` file requires read access**: on Linux, `/proc/<pid>/comm` is readable by the owner; if the daemon was started by a different user the read may fail. The `try/catch` already handles that — return false means "not ours, don't kill".
- **Identity collision**: if a user runs two sireno-deck checkouts simultaneously and both are in dev mode, the daemon-identity match would reap both. That's an acceptable tradeoff (two simultaneous dev daemons are not a supported config); the alternative is to leave the user stuck.
- **Frontend vite startup grace**: 10s is a guess. If vite legitimately takes >10s on first compile, the daemon still crashes. Tune via observation; can be hoisted to a config flag later.
- **Existing pid-file cleanup order**: `reapStaleDaemon` runs before `readPid` check. If the new daemon starts but the OLD daemon was already dead, the new daemon should proceed normally. The reap should be a no-op when nothing matches.
