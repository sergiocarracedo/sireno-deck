---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
created: 2026-08-20
deepened: 2026-08-20
---

# Plan: Detach `pnpm dev start` so it returns control like production

## Goal capsule

Make `pnpm dev start --emulator` (and any flag combo) fork the daemon in the background and exit cleanly, so the operator gets the shell back immediately and can drive the daemon with the same `pnpm dev status | stop | restart | reload | logs` commands that production uses. Production's `sirenodeck start` already does this via systemd/launchd; dev's `pnpm dev start` should match it 1:1 in shape — the only difference is the daemon process is detached by the local tsx wrapper instead of by the OS service manager.

## Problem frame

`pnpm dev start` (the dev entry point) does not behave like `sirenodeck start` (the production entry point). Production forks a daemon via the service manager and exits; subsequent `sirenodeck status | stop | restart | reload | logs` commands talk to the running daemon through the pid/token files in `$XDG_RUNTIME_DIR/sireno-deck/`. Dev mode wraps the CLI in `tsx watch` and then calls `forkOffDev` → `superviseService`, which makes the dev wrapper **itself** the daemon supervisor. The wrapper holds the event loop open watching for child crashes and never exits. The operator cannot run `pnpm dev status` from another terminal because (a) the wrapper blocks the terminal until Ctrl+C, and (b) the daemon's pid is owned by the wrapper, not by the pid-file contract that the rest of the CLI speaks to.

The current dev path also has two less-obvious divergences from production that this plan removes:

1. **Different `argv[1]`.** The forked daemon in dev runs as `tsx src/cli/main.ts start`, so its `argv[1]` ends in `.ts`. Production's daemon runs as `bin/sirenodeck.js start`, so `argv[1]` ends in `.js`. Different interpreter chain on the daemon side.
2. **Different supervisor.** Production's auto-restart comes from systemd (`Restart=always`). Dev's auto-restart comes from a Node-level supervisor inside the wrapper. Two different supervisors, two different retry schedules, two different restart semantics.

The fix keeps dev's hot-reload of the wrapper itself (tsx watch on `bin/dev.js`) but removes the Node-level supervisor around the daemon. The wrapper exits as soon as the daemon is spawned. The daemon is detached via `spawnDetached({ detached: true, stdio: "ignore" })`. Subsequent CLI commands find the daemon through the pid file, exactly as in production.

## Requirements

- **R1** — `pnpm dev start` must exit with code 0 in under 2 s, after spawning the daemon and printing a single confirmation line (`daemon started, pid <N>`).
- **R2** — The spawned daemon must run as the production bin path (`bin/sirenodeck.js`), not as `tsx src/cli/main.ts`. The wrapper's `tsx watch` only wraps the **wrapper**, not the daemon.
- **R3** — Every CLI flag passed to `pnpm dev start` (`--emulator`, `--remote`, `--port`, `--device-model`, `--http-port`, `--config`) must reach the daemon as CLI args. The daemon must observe them identically to production.
- **R4** — After `pnpm dev start` exits, `pnpm dev status` from any other shell must report the daemon alive, with the same fields it reports in production.
- **R5** — After `pnpm dev start` exits, `pnpm dev stop` from any other shell must SIGTERM the daemon and clean the pid/token/children files, identically to production's `sirenodeck stop`.
- **R6** — After `pnpm dev start` exits, `pnpm dev reload` must SIGUSR1 the running daemon. `pnpm dev restart` must SIGTERM the old daemon and spawn a fresh one with the same flags. `pnpm dev logs` must tail the same `service.log` production writes.
- **R7** — When the daemon crashes in dev, the daemon stays dead. There is no auto-restart in dev. The operator runs `pnpm dev restart` to bring it back. This matches production exactly: production's systemd also gives up eventually (`StartLimitBurst`/`StartLimitIntervalSec`), and the operator uses `systemctl restart` to recover.
- **R8** — `pnpm dev` (with no subcommand) still prints the CLI help. `pnpm dev logs --follow` still tails the log under `tsx watch` so Ctrl+C keeps working. No other command changes shape.
- **R9** — All existing tests pass; coverage of the new detach path is added; the `service-supervisor` and the `.ts`-branch in `spawn-daemon.ts`'s `resolveInterpreter` are deleted (dead after the fix).
- **R10** — Verification per AGENTS.md: `pnpm lint && pnpm format && pnpm typecheck`, `pnpm test --run`, then `node packages/cli/bin/dev.js start --emulator --port 52937` plus the `agent-browser` smoke checks.

## Scope

### In scope

- `packages/cli/bin/dev.js` — drop the `start`-special-case probe and the `tsx watch` wrap on `start`. Keep `tsx watch` for `logs`.
- `packages/cli/src/cli/commands/start.ts` — replace `forkOffDev` with a `startInBackground` that uses the production bin path, forwards every flag, spawns via `spawnDetached`, and returns. The preflight probe moves out of `bin/dev.js` and into `startInBackground` so production and dev share it.
- `packages/cli/src/cli/commands/spawn-daemon.ts` — drop the `.ts` branch in `resolveInterpreter`. After the fix nothing passes a `.ts` bin path.
- `packages/cli/src/cli/commands/service-supervisor.ts` — delete (unused after the fix).
- `packages/cli/src/cli/commands/__tests__/start.test.ts` — update the dev-path assertions to match the new shape.
- `packages/cli/src/cli/commands/__tests__/start-in-background.test.ts` — new test for the detach path.
- `packages/cli/src/cli/commands/__tests__/service-supervisor.test.ts` — delete (file under test is deleted).
- `packages/cli/src/cli/commands/restart.ts` — make it work in dev (currently calls `invokeManager`, which shells out to `systemctl`/`launchctl`). Add a dev-detection branch that does `stop` + `start` instead.
- `docs/solutions/conventions/dev-detach-match-production.md` — institutionalize the rationale.
- `ARCHITECTURE.md §3.11.1` — update wording.

### Out of scope

- Removing the `isUnderServiceManager()` gate in `start.ts:695`. It still serves production (`SIRENO_DAEMON_CHILD=1` from systemd) and dev (the forked daemon sets the same env var).
- Changing the systemd unit (`packages/cli/src/cli/commands/service/install.ts`). Production path is unchanged.
- Hot-reload of the daemon process via `tsx watch`. The daemon is forked once and detached; TS changes to daemon code require `pnpm dev restart`. This matches production (systemd doesn't hot-reload either).
- The `.ts` branch in `spawn-daemon.ts:resolveInterpreter` being a _load-bearing_ code path. It stays as a defensive stub for one cycle in case a future caller needs it. (See decision below — actually deleted, see DEBT comment.)
- Anything related to the LAN/remote binding logic in `bin/dev.js`. Already fine.

## Decisions and rationale

### D1 — Production daemon path in dev

`startInBackground` resolves `binPath` to `<cli-root>/bin/sirenodeck.js` (an absolute path), the same path the systemd unit's `ExecStart` resolves to. The forked daemon's `argv[1]` is then `bin/sirenodeck.js`, identical to the production daemon's `argv[1]`. Inside `bin/sirenodeck.js` it spawns tsx with `src/cli/main.ts`, exactly as production.

**Rejected**: keep `process.argv[1]` of the wrapper as the daemon bin path. This makes the daemon `tsx src/cli/main.ts start`, which diverges from production's argv shape and forces `resolveInterpreter` to special-case `.ts` paths. Production parity wins.

**Rejected**: skip `bin/sirenodeck.js` and fork directly into tsx with `src/cli/main.ts`. Saves a process hop but loses argv[1] parity. The hop is one shell exec — cheap.

### D2 — Flag forwarding

`startInBackground` forwards `--emulator`, `--remote`, `--port`, `--device-model`, `--http-port`, `--config` to the forked daemon as inline CLI args. Production's daemon reads these from the runtime flags file (`flags.json`) written by `startProduction`; forwarding inline makes dev match the user-facing shape 1:1.

**Rejected**: dev reads `flags.json` written by `startInBackground`, like production. More code, more shared surface. Inline forwarding is the same contract with less surface area; the daemon's command parser already accepts both `argv` and `flags.json` reads.

**Rejected**: forward only `--emulator`. Operator would lose the ability to set `--port`, `--remote`, etc. in dev. Forwards every flag, drop the rest.

### D3 — Wrapper does not supervise the daemon

After the fork, the wrapper returns from `startInBackground` and exits. There is no `superviseService`, no `DEFAULT_SERVICE_RETRY_SCHEDULE_MS`, no black-frame push on crash.

**Rejected**: keep `superviseService` as a "supervised dev" mode behind a flag. Two modes to remember, more code, more divergence from production. User asked for "matches production exactly" — this is that.

**Rejected**: provide a separate `pnpm dev start --watch` for supervised mode. Same problem; defer until asked.

### D4 — Delete `service-supervisor.ts` outright

Once `forkOffDev` is gone, nothing imports `superviseService`. Ponytail rule: deletion over addition. The retry schedule, black-frame push, and graceful-exit logic were useful only for the supervisor case. If we ever want supervised dev later, re-add the file from git history (commit `cee1f00e feat: service-supervisor-and-vite-backoff`).

### D5 — Drop the `.ts` branch in `resolveInterpreter`

Once `startInBackground` always passes a `.js` bin path, the `if (!binPath.endsWith(".ts")) return { cmd: process.execPath, prefixArgs: [] }` early-return is the only path. The `.ts` branch (lines 60-81) is unreachable. Delete it; the function collapses to a one-liner.

### D6 — `restart` needs a dev branch

`restart.ts` currently does `ensureInstalled + invokeManager({ action: "restart" })`. `invokeManager` shells out to `systemctl`/`launchctl`, which fails (or succeeds with no effect) when the daemon was forked by the dev wrapper, not by the service manager. Add a dev branch: if `isDevInvocation()` is true, run `stop()` + `start()` (the in-process CLI commands) instead of `invokeManager`.

### D7 — `bin/dev.js` does the system-requirements probe

Today the probe lives in `bin/dev.js` only because the special-case `start` branch ran plain tsx for the probe before running `tsx watch` for `start`. After the fix, `bin/dev.js` does plain tsx for everything except `logs`. The probe moves into `startInBackground` so production and dev share it (production today calls it through `runFirstRunCheckIfNeeded` at `start.ts:700` — but only when **not** under the service manager; the in-process daemon path skips it via `isUnderServiceManager()`. The probe is now redundant for production because systemd's `ExecStart` triggers the first-run wizard via the install step. For dev we add it to `startInBackground` to keep parity.

**Rejected**: leave the probe in `bin/dev.js`. Adds coupling between the wrapper and the CLI's startup logic; harder to test. Inline the probe in `startInBackground`.

## Existing patterns to follow

- **`spawnDetached` (`packages/cli/src/cli/commands/spawn-daemon.ts`)** — already supports `binPath: string`, `args: ReadonlyArray<string>`, `remote: boolean`. Sets `SIRENO_DAEMON_CHILD=1` and `SIRENO_REMOTE=0|1` env. Uses `detached: true` + `child.unref()` so the wrapper can exit without orphaning the daemon. Reused as-is.
- **`resolveDaemonPaths` (`packages/cli/src/util/daemon.ts`)** — single source of truth for `$XDG_RUNTIME_DIR/sireno-deck/{pid, token, children, runtime-state, flags}`. Used by `startProduction`, `stop`, `status`, `reload`, `restart`. The new `startInBackground` writes the same files.
- **`buildRuntimeFlags` (`packages/cli/src/cli/commands/start.ts:356-364`)** — already normalizes `StartOptions → RuntimeFlags`. Reused; the CLI-args forwarder reads from the same `RuntimeFlags`.
- **`pruneStaleChildren` / `terminateChildren` / `writeFlags` / `writeConfigPath`** — already used by both `startInProcess` and `forkOffDev`. `startInBackground` reuses them in the same order.
- **`isUnderServiceManager` (`packages/cli/src/cli/commands/spawn-daemon.ts:32-34`)** — `process.env["SIRENO_DAEMON_CHILD"]` truthy → in-process. The forked daemon's wrapper process has it set (added by `spawnDetached`), so when the daemon re-enters `start()` it short-circuits to `runInProcess()`. This is exactly how production works.
- **`stop.ts`, `status.ts`, `reload.ts`, `logs.ts`** — all read the pid file from `resolveDaemonPaths()`. None of them care how the daemon was forked. They keep working once `startInBackground` writes the same pid file.

## Implementation units

### Unit 1 — `packages/cli/bin/dev.js`: drop the `start` special case

**Files**: `packages/cli/bin/dev.js`

**Change**:

- Remove the entire `if (firstArg === "start")` block (lines 75-136 in current file).
- Drop `start` from `LONG_LIVED_COMMANDS` (set becomes `new Set(["logs"])`).
- The probe (system-requirements) no longer runs in the wrapper; it moves to `startInBackground`.

**Test shape**: `pnpm dev --help` (any non-special command) runs under plain tsx. `pnpm dev logs --follow` runs under `tsx watch`. `pnpm dev start --emulator` runs under plain tsx and exits when the script exits.

### Unit 2 — `packages/cli/src/cli/commands/start.ts`: `startInBackground`

**Files**: `packages/cli/src/cli/commands/start.ts`

**Change**:

- Delete `forkOffDev` (lines 522-552).
- Add `startInBackground(options)`:
  ```ts
  const startInBackground = async (options: StartOptions): Promise<void> => {
    const { logger } = options
    const resolved = resolveConfigPath(options)
    const configPath = resolved.path
    logger.info(
      { configPath, source: resolved.source },
      `start: using config ${configPath} (source: ${resolved.source})`,
    )
    const runtimeFlags = buildRuntimeFlags(options)
    writeConfigPath(configPath)
    writeFlags(runtimeFlags)
    pruneStaleChildren(undefined, logger)
    await terminateChildren({ logger, timeoutMs: 2_000 })

    const cliRoot = resolveCliRoot()
    const binPath = resolvePath(cliRoot, "bin", "sirenodeck.js")
    const args = buildDetachedArgs(runtimeFlags)
    const { pid } = spawnDetached({
      binPath,
      args,
      remote: options.remote === true,
    })
    writePid(pid)
    logger.info(
      { pid, configPath, args },
      "start: daemon spawned, returning to cli",
    )
  }
  ```
- Helpers:
  ```ts
  const resolveCliRoot = (): string => {
    const here = dirname(fileURLToPath(import.meta.url))
    return resolvePath(here, "..", "..") // commands/ → cli/commands → cli/
  }

  const buildDetachedArgs = (flags: RuntimeFlags): string[] => {
    const args: string[] = ["start"]
    if (flags.emulator) args.push("--emulator")
    if (flags.remote) args.push("--remote")
    if (flags.port !== undefined) args.push("--port", String(flags.port))
    if (flags.deviceModel !== undefined)
      args.push("--device-model", flags.deviceModel)
    if (flags.httpPort !== 3939)
      args.push("--http-port", String(flags.httpPort))
    return args
  }
  ```
- Replace the `if (isDevInvocation()) { await forkOffDev(options) }` branch at line 752 with `await startInBackground(options)`.
- Delete the `import { superviseService } from "./service-supervisor"` at line 52.

### Unit 3 — `packages/cli/src/cli/commands/spawn-daemon.ts`: drop the `.ts` branch

**Files**: `packages/cli/src/cli/commands/spawn-daemon.ts`

**Change**:

- Replace `resolveInterpreter` (lines 60-81) with:
  ```ts
  const resolveInterpreter = (): Interpreter => ({
    cmd: process.execPath,
    prefixArgs: [],
  })
  ```
- Update `spawnDetached` (line 117) to call `resolveInterpreter()` instead of `resolveInterpreter(binPath)`.

### Unit 4 — `packages/cli/src/cli/commands/service-supervisor.ts`: delete

**Files**: `packages/cli/src/cli/commands/service-supervisor.ts`

**Change**: delete the file. The supervised-restart behavior is unreachable after Unit 2.

### Unit 5 — `packages/cli/src/cli/commands/restart.ts`: dev branch

**Files**: `packages/cli/src/cli/commands/restart.ts`

**Change**:

- Add `isDevInvocation` import from `./spawn-daemon` (or reimplement locally — it's a one-liner: `(process.argv[1] ?? "").endsWith(".ts")`).
- Branch at top of `restart()`:
  ```ts
  if (isDevInvocation()) {
    await stop({ logger })
    await start({ logger, ...buildStartOptionsFromFlags() })
    return
  }
  ```
  `buildStartOptionsFromFlags()` reads the cached `flags.json` (via `readFlags`) and the cached `config.json` (via `readConfigPath`) so the operator doesn't have to re-pass flags. Falls back to `process.argv` for the case where no flags were persisted.

### Unit 6 — `packages/cli/src/cli/commands/__tests__/start.test.ts`: update dev-path assertions

**Files**: `packages/cli/src/cli/commands/__tests__/start.test.ts`

**Change**:

- The existing test at line 404 ("forks off: calls spawnDetached and writePid with the spawned pid") still applies but the assertions need to change: `binPath` is now `bin/sirenodeck.js`, not `argv[1]`. Update to:
  ```ts
  expect(spawnDetached).toHaveBeenCalledWith(
    expect.objectContaining({
      binPath: expect.stringMatching(/bin\/sirenodeck\.js$/),
      args: ["start"],
    }),
  )
  ```
- The "resolves immediately without blocking on the forked pipeline" test (line 437) becomes the load-bearing assertion: `startInBackground` returns in <10 ms after spawning. Keep the same assertion.
- The preflight-failure tests (line 453+) still apply — they test the in-process path (`SIRENO_DAEMON_CHILD=1`), not the dev path. No edit needed there.
- Add a new test: "forwards every CLI flag to the spawned daemon". Setup with `--emulator`, `--port=52937`, `--device-model=mk2`, `--http-port=3939`. Assert `spawnDetached` was called with `args: ["start", "--emulator", "--port", "52937", "--device-model", "mk2"]` (and no `--http-port` since it equals the default 3939).

### Unit 7 — `packages/cli/src/cli/commands/__tests__/start-in-background.test.ts`: new test

**Files**: `packages/cli/src/cli/commands/__tests__/start-in-background.test.ts` (new)

**Test scenarios**:

1. **Spawns the production bin path.** `startInBackground({ emulator: true })` → `spawnDetached` called with `binPath` ending in `bin/sirenodeck.js` and `args` containing `--emulator`.
2. **Writes pid + flags before spawning.** Order of operations: `writeFlags` → `writePid` must happen, both before the parent exits.
3. **Forwards every flag.** Six scenarios: each of `--emulator`, `--remote`, `--port`, `--device-model`, `--http-port`, `--config` separately, and one "all flags" test.
4. **Does not call `superviseService`.** Mock `superviseService` and assert it was not called.
5. **Returns without an event loop listener.** After `startInBackground` resolves, `process.listenerCount("SIGINT")` and `process.listenerCount("SIGTERM")` are at baseline (not +1 as they would be if the wrapper were watching the daemon).
6. **Returns without `setTimeout`/`setInterval` still pending.** Use `process._getActiveHandles()` (test-only) or wrap the call in a `setImmediate` and assert no timers fire after resolution.

### Unit 8 — `packages/cli/src/cli/commands/__tests__/service-supervisor.test.ts`: delete

**Files**: `packages/cli/src/cli/commands/__tests__/service-supervisor.test.ts`

**Change**: delete. Subject of test is gone.

### Unit 9 — `docs/solutions/conventions/dev-detach-match-production.md`: learning doc

**Files**: `docs/solutions/conventions/dev-detach-match-production.md` (new)

**Content**:

- **Status**: Active.
- **Date**: 2026-08-20.
- **Module**: CLI command surface (`packages/cli/bin/dev.js`, `packages/cli/src/cli/commands/{start,restart}.ts`).
- **Problem**: `pnpm dev start` was a `tsx watch` wrapper around a `forkOffDev` that held the wrapper open with `superviseService`. Operator couldn't run subsequent `pnpm dev status | stop | restart` commands because (a) the wrapper blocked the terminal, and (b) the daemon's pid was owned by the wrapper, not the pid-file contract the rest of the CLI speaks to.
- **Fix**: dropped the `start` special case in `bin/dev.js` (plain tsx now, exits when the script exits); replaced `forkOffDev` with `startInBackground` that uses `bin/sirenodeck.js` as the bin path, forwards every flag, and calls `spawnDetached`; deleted `service-supervisor.ts`.
- **Behavior**: `pnpm dev start` exits in <2 s with a single `daemon started, pid N` line. Subsequent `pnpm dev status | stop | restart | reload | logs` work from any shell, identical to production.
- **Crash policy**: dev no longer auto-restarts the daemon. Matches production (systemd also gives up eventually). Operator runs `pnpm dev restart` to recover.

### Unit 10 — `ARCHITECTURE.md §3.11.1`: wording update

**Files**: `ARCHITECTURE.md`

**Change**: rewrite the "In dev mode the parent process becomes the supervisor" subsection. New wording:

> In dev mode the daemon is forked detached and the wrapper exits. The forked daemon is spawned with `bin/sirenodeck.js` as its `argv[1]`, so it shares its entry-point identity with the systemd-installed daemon. Status / stop / restart / reload / logs all read the pid file at `$XDG_RUNTIME_DIR/sireno-deck/`, identical to production.
>
> If the daemon crashes in dev, the daemon stays dead. There is no Node-level auto-restart supervisor in dev mode; the operator runs `pnpm dev restart` to bring it back. This matches production exactly: production's systemd also gives up eventually, and the operator uses `systemctl restart sireno-deck` to recover.

## Files touched (cumulative)

- `packages/cli/bin/dev.js` — drop `start` special case.
- `packages/cli/src/cli/commands/start.ts` — `startInBackground`, drop `forkOffDev`, drop `superviseService` import.
- `packages/cli/src/cli/commands/spawn-daemon.ts` — simplify `resolveInterpreter`.
- `packages/cli/src/cli/commands/service-supervisor.ts` — **delete**.
- `packages/cli/src/cli/commands/restart.ts` — dev branch.
- `packages/cli/src/cli/commands/__tests__/start.test.ts` — update dev-path assertions.
- `packages/cli/src/cli/commands/__tests__/start-in-background.test.ts` — **new**.
- `packages/cli/src/cli/commands/__tests__/service-supervisor.test.ts` — **delete**.
- `docs/solutions/conventions/dev-detach-match-production.md` — **new**.
- `ARCHITECTURE.md §3.11.1` — wording update.

Approximate net deletion: ~250 LoC (the supervisor file + its test + `forkOffDev` + the `start` special case + the `.ts` interpreter branch + dead comments).
Approximate net addition: ~120 LoC (new test + learning doc + `startInBackground` + flag-forwarding helper + restart dev branch).

## Test scenarios (per implementation unit)

### Unit 1 (`bin/dev.js`)

- **1a** `node bin/dev.js --help` exits 0 with help text. (no regression)
- **1b** `node bin/dev.js start` exits in <2 s (was: never). Manual smoke.
- **1c** `node bin/dev.js logs --follow` runs under `tsx watch`. (no regression)

### Unit 2 (`startInBackground`)

- **2a** spawns `bin/sirenodeck.js` with `args: ["start"]` when no flags.
- **2b** forwards `--emulator`, `--remote`, `--port N`, `--device-model mk2`, `--http-port 3939`, `--config /path` as inline CLI args.
- **2c** omits flags at their default values (`--http-port 3939` is the default; not forwarded).
- **2d** writes `pid.json` and `flags.json` before forking.
- **2e** does not import or call `superviseService` (verify with mock).

### Unit 3 (`spawn-daemon.ts`)

- **3a** `resolveInterpreter()` returns `{ cmd: process.execPath, prefixArgs: [] }`. Covered indirectly via `spawnDetached`'s existing tests.

### Unit 5 (`restart.ts`)

- **5a** In dev: `restart()` calls `stop()` then `start()` with the same flags from `flags.json`.
- **5b** In prod (not dev): unchanged — `invokeManager` path.
- **5c** When `flags.json` is missing, falls back to `argv` (the operator can pass `--emulator` etc. on the `pnpm dev restart` line).

### Unit 7 (new test)

- See implementation unit 7 above.

### Cross-unit smoke (manual, AGENTS.md verification block)

- **S1** `pnpm lint && pnpm format && pnpm typecheck` — all green.
- **S2** `pnpm test --run` — all green.
- **S3** `node packages/cli/bin/dev.js start --emulator --port 52937` exits in <2 s; `cat $XDG_RUNTIME_DIR/sireno-deck/pid` shows the daemon pid.
- **S4** `pnpm dev status` reports alive.
- **S5** `pnpm dev restart` old daemon gone, new daemon up, new pid.
- **S6** `pnpm dev reload` daemon reloaded in place, same pid.
- **S7** `pnpm dev stop` daemon gone, pid file removed.
- **S8** `pnpm dev start --emulator` again — fresh start works.
- **S9** `pnpm dev logs --follow` tails the log.
- **S10** `pstree -p $$` after S3 — only the shell. The daemon is detached and adopted by init.
- **S11** `kill -9 <daemon pid>` — daemon stays dead. `pnpm dev status` reports it dead. `pnpm dev restart` brings it back.
- **S12** `agent-browser` per AGENTS.md §Verification: emulator `http://127.0.0.1:52938/#/device` shows deck grid; frontend `http://127.0.0.1:5180/` shows main deck; WS open on `52937`.

## Dependencies and sequencing

No new dependencies. The change is pure deletion + a small addition.

**Sequencing** (one commit per unit, or batched into one — both fine; pick what the reviewer likes):

1. Unit 1 (drop start special case) + Unit 2 (`startInBackground`) + Unit 3 (simplify `resolveInterpreter`) + Unit 6 (update tests) — these touch the hot path; do them as one commit so the test suite never goes red mid-change.
2. Unit 4 (delete `service-supervisor.ts`) + Unit 8 (delete its test) — can be in the same commit as #1 or a follow-up; they only matter if `forkOffDev` is gone.
3. Unit 5 (restart dev branch) — separate commit, smaller diff, easier review.
4. Unit 7 (new test) — can be in #1 or follow-up; it asserts the new shape.
5. Unit 9 (learning doc) — can be the last commit.
6. Unit 10 (ARCHITECTURE.md) — can be bundled with #5.

## Risks and mitigations

- **Risk**: `bin/dev.js` exits before the daemon's pid file is written, leading to a race where `pnpm dev status` from another shell sees no daemon. **Mitigation**: `spawnDetached` returns the child's pid synchronously (Node's `spawn` blocks until the child is forked, then returns); we write the pid file before returning from `startInBackground`. The daemon's startup time is independent of the wrapper's exit time — the wrapper can exit immediately after writing the pid file; the daemon keeps starting in the background.
- **Risk**: the forked daemon's `argv[1]` differs in some subtle way that the daemon's startup path doesn't account for. **Mitigation**: production's daemon _is_ `bin/sirenodeck.js start`; that's the exact path we're now using in dev. No new code paths.
- **Risk**: operator runs `pnpm dev restart` and the daemon's flags drift from what they originally launched with. **Mitigation**: `restart.ts` reads `flags.json` (written by `startInBackground`) and re-uses them; falls back to current `argv` if `flags.json` is missing.
- **Risk**: removing `service-supervisor.ts` loses the black-frame-on-crash behavior in dev. **Mitigation**: the user explicitly chose "no auto-restart", which means crashes don't happen silently — `pnpm dev status` reports the dead pid. The operator runs `pnpm dev restart`, which spawns a new daemon. The new daemon does its own preflight and connects to the device normally; no need for an outside-the-daemon black-frame push (the daemon's own teardown already does it).

## Open questions for the user

None. The user picked all three options (Option C / delete supervisor / forward every flag) and the design flows from those choices.

## Reference

- Origin discussion: same conversation that produced this plan (the user wanted `pnpm dev start` to detach like production).
- Predecessor plan: `docs/plans/2026-08-10-cli-distributable-binary-build.md` — discusses `bin/sirenodeck.js` shape.
- Affected existing files: `packages/cli/bin/dev.js`, `packages/cli/bin/sirenodeck.js`, `packages/cli/src/cli/commands/start.ts`, `spawn-daemon.ts`, `restart.ts`, `service-supervisor.ts`, `__tests__/start.test.ts`, `__tests__/service-supervisor.test.ts`.
- Architecture context: `ARCHITECTURE.md §3.11.1`, `§3.1`, `§3.9`.
