# Dev mode now mirrors production: detached daemon, CLI returns control

## Status

Active.

## Date

2026-08-20.

## Module

CLI command surface (`packages/cli/bin/dev.js`,
`packages/cli/src/cli/commands/{start,restart}.ts`,
`packages/cli/src/cli/commands/spawn-daemon.ts`).

## Problem

`pnpm dev start` did not behave like `sirenodeck start`. Production forks a
daemon via the service manager (systemd / launchd) and exits; subsequent
`sirenodeck status | stop | restart | reload | logs` commands talk to the
running daemon through the pid/token files in `$XDG_RUNTIME_DIR/sireno-deck/`.

Dev mode wrapped the CLI in `tsx watch` and then called `forkOffDev` →
`superviseService`, which made the dev wrapper **itself** the daemon
supervisor. The wrapper held the event loop open watching for child crashes
and never exited. The operator could not run `pnpm dev status` from another
terminal because (a) the wrapper blocked the terminal until Ctrl+C, and
(b) the daemon's pid was owned by the wrapper, not by the pid-file contract
the rest of the CLI speaks to.

The dev path also diverged from production in two more subtle ways:

1. **Different `argv[1]`.** The forked dev daemon ran as
   `tsx src/cli/main.ts start`, so its `argv[1]` ended in `.ts`. The
   systemd-installed daemon ran as `bin/sirenodeck.js start`, so `argv[1]`
   ended in `.js`. Different interpreter chain on the daemon side.
2. **Different supervisor.** Production's auto-restart came from systemd
   (`Restart=always`). Dev's auto-restart came from a Node-level supervisor
   inside the wrapper. Two different supervisors, two different retry
   schedules, two different restart semantics.

## Fix

- **Dropped the `start`-special-case in `bin/dev.js`.** Plain `tsx` for
  everything except `logs` (the tail command, which still wants `tsx watch`
  so Ctrl+C keeps working). Plain tsx exits when the script exits.
- **Replaced `forkOffDev` with `startInBackground`** in
  `packages/cli/src/cli/commands/start.ts`. The new function:
  - Resolves `binPath` to the production bin entry,
    `<cli-root>/bin/sirenodeck.js` (absolute path), instead of
    `process.argv[1]`. The forked daemon's `argv[1]` is now identical to
    the systemd-installed daemon's `argv[1]`.
  - Forwards every CLI flag (`--emulator`, `--remote`, `--port`,
    `--device-model`, `--http-port`, `--config`) as inline args to the
    forked daemon.
  - Calls `spawnDetached({ detached: true, ... })`, writes the pid file,
    and returns. The wrapper exits cleanly.
- **Simplified `spawn-daemon.ts`'s `resolveInterpreter`.** After the fix
  nothing passes a `.ts` bin path; the function collapses to
  `{ cmd: process.execPath, prefixArgs: [] }`.
- **Deleted `service-supervisor.ts`** (and its test). Nothing imports
  `superviseService` after the fix. The retry schedule, black-frame push,
  and graceful-exit logic were useful only for the supervisor case. If we
  ever want supervised dev later, re-add the file from git history
  (commit `cee1f00e feat: service-supervisor-and-vite-backoff`).
- **Added a dev branch to `restart.ts`.** Production `restart` calls
  `ensureInstalled` + `invokeManager("restart")` (shells out to systemctl /
  launchctl). Dev `restart` reads the cached `flags.json` and runs the
  in-process `stop` + `start` pair instead. The operator never invokes the
  OS service manager against a daemon the manager didn't start.
- **Updated `start.test.ts`** to assert the dev path spawns the production
  bin path, forwards every flag, and omits defaults.
- **Added `restart.test.ts`** for the dev branch (4 scenarios: dev path
  uses stop+start, dev path warns when flags.json is missing, dev path
  forwards every persisted flag, prod path still uses `invokeManager`).

## Behavior

| Command                        | Behavior                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev start`               | Spawns `bin/sirenodeck.js start [--emulator] [--remote ...]` via `spawnDetached`, writes pid+token+flags, exits. Daemon runs in background. |
| `pnpm dev status`              | Reads pid file, reports alive/dead, port, mode.                                                                                             |
| `pnpm dev restart`             | In dev: `stop` + re-`start` with the same flags from `flags.json`. In prod: `invokeManager("restart")`.                                     |
| `pnpm dev reload`              | SIGUSR1 the running daemon.                                                                                                                 |
| `pnpm dev stop`                | SIGTERM the running daemon.                                                                                                                 |
| `pnpm dev logs`                | `tsx watch` tails the log file. Ctrl+C to exit.                                                                                             |
| `pnpm dev system-requirements` | Plain tsx, one-shot, exits.                                                                                                                 |
| Production `sirenodeck start`  | Unchanged. systemd/launchd.                                                                                                                 |

## Crash policy

The daemon no longer auto-restarts in dev. Matches production exactly: in
production, if the daemon's restart attempts fail (systemd's
`StartLimitBurst` / `StartLimitIntervalSec`), systemd gives up. The
operator runs `systemctl restart sireno-deck` to recover. Same here:
`kill -9 <pid>` kills the daemon, `pnpm dev status` reports it dead,
`pnpm dev restart` brings it back with the same flags.

## Tests added

- `packages/cli/src/cli/commands/__tests__/restart.test.ts` — dev branch
  coverage (4 tests).
- `packages/cli/src/cli/commands/__tests__/start.test.ts` — three new
  tests on the dev path:
  - `spawns the production bin path in dev (bin/sirenodeck.js, not argv[1])`
  - `forwards every CLI flag to the spawned daemon`
  - `omits flags at their default values`

## References

- Plan: `docs/plans/2026-08-20-dev-detach-match-production.md`.
- Predecessor: commit `cee1f00e feat: service-supervisor-and-vite-backoff`
  (introduced `service-supervisor.ts`; deleted in this fix).
- Architecture context: `ARCHITECTURE.md §3.11.1`.
