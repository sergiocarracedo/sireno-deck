# Default log level `info`, in-place reload, and post-start prompt

## Status

Active.

## Date

2026-08-20.

## Module

CLI command surface (`packages/cli/src/cli/index.ts`,
`packages/cli/src/cli/startup-display.ts`,
`packages/cli/src/cli/commands/{run,reload}.ts`,
`packages/cli/src/cli/commands/__tests__/{run,signal-provider}.test.ts`,
`packages/cli/src/cli/__tests__/prompt-reload-tail.test.ts`).

## Problem

Three related operator-facing issues that surface together:

1. **`pnpm dev status` prints nothing.** `status.ts` calls
   `logger.info(...)` for every line. `buildLogger` defaulted the pino
   level to `error` (only `debug` when `--verbose` was passed). Pino
   dropped everything below `error`. The operator's terminal stayed
   empty.

2. **`pnpm dev logs` doesn't show button taps.** Same root cause on
   the forked daemon: it ran at `error` level. The runtime's
   `dispatchGesture` / `invokeAction` (logged at `info`) never reached
   `service.log`. The tail produced nothing new.

3. **`pnpm dev reload` was a latent daemon crash.** `reload.ts` sent
   SIGUSR1 to the daemon pid. The daemon had no `SIGUSR1` handler —
   the daemon process's `installProcessGuards` only registered
   `SIGTERM` / `SIGINT` / `uncaughtException` / `unhandledRejection`.
   Node's default action for `SIGUSR1` is to terminate the process.
   Every `pnpm dev reload` and every production `systemctl
reload-or-restart` silently killed the daemon. The crash was masked
   because:
   - Production: systemd's `Restart=always` respawned it instantly.
   - Dev: nobody tested the path (the operator used
     `pnpm dev restart` instead).

4. **No health-check prompt after `start`.** After
   `pnpm dev start` printed `✓ SirenoDeck started`, the operator had no
   quick way to confirm the daemon was healthy or that the log path was
   live. Forced into manual `pnpm dev reload` + `pnpm dev logs`.

## Fix

### Default log level `info`

`packages/cli/src/cli/index.ts`:

```ts
const level =
  argv.quiet || normalized === "silent"
    ? "silent"
    : (normalized ?? (argv.verbose ? "debug" : "info")) // was "error"
```

One line. Side effects:

- **`pnpm dev status`** now prints every line (`daemon is running`,
  `token present`, `tracked children`).
- **Button-tap logs** now reach `service.log` and the runtime
  prints `runtime: reloaded via SIGUSR1` (or
  `runtime: invoke <addon>:<method>` etc.) on the next `pnpm dev logs`
  tail.
- The `--verbose` override (`debug`) and `--quiet` /
  `--log-level silent` paths are unchanged.
- Production gets more info-level logs in `service.log` / journal;
  operators who want quiet can pass `--log-level error` or `--quiet`.

### Daemon-side SIGUSR1 handler

`packages/cli/src/cli/commands/run.ts`:

```ts
export interface SignalProvider {
  onSignal(handler: () => void): () => void
  onReload(handler: () => void): () => void
}

export const defaultSignals: SignalProvider = {
  onSignal(handler: () => void): () => void {
    process.once("SIGINT", handler)
    process.once("SIGTERM", handler)
    return () => {
      process.off("SIGINT", handler)
      process.off("SIGTERM", handler)
    }
  },
  onReload(handler: () => void): () => void {
    process.once("SIGUSR1", handler)
    return () => process.off("SIGUSR1", handler)
  },
}

// … and in runPipeline:
unregisterReload = signals.onReload(() => {
  logger.info("runtime: reloaded via SIGUSR1")
  if (runtime !== null) runtime.invalidate()
})
```

The reload handler fires `runtime.invalidate()`, which publishes
`runtime:invalidate` on the pubsub (`runtime.ts:677`). The
`BrowserRenderer` already subscribes to that and triggers a screenshot
tick; the runtime itself rebroadcasts `deck-config` via existing
state subscriptions — so the visible effect is that connected
frontends re-render with current state.

`runtime.invalidate` is **non-destructive**: it does not re-preflight,
does not reload addons, does not re-resolve the theme. Production
operators who need a full config reload use
`systemctl restart sireno-deck` (which `pnpm dev restart` mirrors).

### Post-start prompt

`packages/cli/src/cli/index.ts:startCommand.handler`:

```ts
printStartupComplete()
if (process.argv[1]?.endsWith(".ts") === true && argv.logs !== true) {
  await promptReloadAndTail({ logger })
}
await startPromise
```

`packages/cli/src/cli/startup-display.ts` adds the helper:

```ts
export const promptReloadAndTail = async (options) => {
  if (!process.stdout.isTTY) return
  const answer = await confirm({
    message: "Reload + tail logs now? [Y/n]",
    initialValue: true,
  })
  if (!answer) return
  await reload({ logger: options.logger })
  const logPath = `${resolveDaemonPaths().runtimeDir}/service.log`
  await Promise.race([
    tailLogs({ logPath, follow: true, lines: 50 }),
    new Promise<void>((r) => setTimeout(resolve, RELOAD_TAIL_WINDOW_MS)),
  ])
}
```

`Promise.race` against a 2 s timeout is the key bit: the operator sees
`reload: sent SIGUSR1 to daemon` and `runtime: reloaded via SIGUSR1` in
the tail, then control returns to the shell. No `Ctrl+C` required.

The prompt gates:

- `process.stdout.isTTY` must be true (skips CI, ssh without pty,
  systemd).
- `argv.logs === false` (skips when the operator already asked for
  the tail via the `--logs` flag — they'd see the same content twice).
- Dev invocation only: `argv[1].endsWith(".ts")` matches the
  `bin/dev.js` wrapper. Production's `bin/sirenodeck.js` arg does not
  end in `.ts`, so the prompt is invisible to production. (Systemd /
  launchd already have their own reload primitives; an interactive
  prompt there would surprise operators.)

## Tests

- `packages/cli/src/cli/commands/__tests__/signal-provider.test.ts`
  (new) — `defaultSignals.onReload` registers / unregisters /
  coexists / is separate from `onSignal`. Four tests. Uses
  `origEmit("SIGUSR1")` instead of `process.kill(...)` because
  sending SIGUSR1 to the worker pid would kill vitest's own IPC
  handler.
- `packages/cli/src/cli/commands/__tests__/run.test.ts` — added
  `SIGUSR1 (in-place reload) triggers runtime.invalidate()
without shutdown`; updated `makeFakeSignals` to also expose
  `onReloadSpy` and `triggerReload()`. 15 tests, all green.
- `packages/cli/src/cli/__tests__/prompt-reload-tail.test.ts` (new)
  — four tests covering: non-TTY skip, answer-no skip,
  answer-yes flow (reload + tail), and a lock on
  `RELOAD_TAIL_WINDOW = 2_000` so future changes to that constant
  surface in review.

## Behavior after fix

| Command                       | Behavior                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev start`              | Daemon spawns, exits. **`Reload + tail logs now? [Y/n]`** prompt. On Y, sends SIGUSR1, tails `service.log` for 2 s, then control returns. |
| `pnpm dev status`             | Now prints `daemon is running`, `token present`, `tracked children` (was: empty).                                                         |
| `pnpm dev logs --follow`      | Per-tap runtime lines visible (was: nothing new because level was `error`).                                                               |
| `pnpm dev reload`             | Sends SIGUSR1. Daemon logs `runtime: reloaded via SIGUSR1`, calls `runtime.invalidate()`. Frontends re-render. Was: latent crash.         |
| `sirenodeck reload`           | Same path, no prompting. Daemon-handler-side change is shared across dev and prod.                                                        |
| `systemctl reload-or-restart` | Same path. systemd sends SIGUSR1; daemon handles it.                                                                                      |
| Production `sirenodeck start` | No prompt (bin/sirenodeck.js is `.js`). Info-level log volume increases; ops can `--quiet` or `--log-level error` if undesired.           |

## References

- Plan: this conversation's pre-build plan.
- Predecessor: PR #21 (`dev-detach-match-production`) which made
  `pnpm dev start` exit cleanly instead of staying open as a
  tsx-watch wrapper. That change exposes the daemon lifecycle that
  this learning doc covers; the SIGUSR1 handler + level-default fix
  build on top of it.
- Related code: `deck/runtime/runtime.ts:677`
  (`runtime.invalidate` → `pubSub.publish('runtime:invalidate')`),
  `render/browser-renderer.ts:121` (`BrowserRenderer` subscribes).

## Out of scope

- Wire `runtime.invalidate()` to perform a full re-preflight (reload
  config + addons + theme). The non-destructive invalidate covers
  the operator's "force SPA to re-render" case; full re-preflight
  belongs in a future PR with its own validation (addons that fail
  on reload, in-flight button presses).
- Auto-reload on config-file change beyond what
  `ConfigWatcher` already does. Current chokidar watcher rebuilds
  runtime decks in-place on deck-only changes and broadcasts
  `iframe-reload` on theme changes. SIGUSR1 reload is the manual
  override for unexpected state.
- Fix the pre-existing top-level `vi.fn()` hoisting failures in
  `cli/__tests__/startup-display.test.ts`. Adjacent test-only
  problem; belongs in a separate cleanup PR.
