# Plan 10-01 Summary

**Completed:** 2026-06-27

## What was built

Production daemon lifecycle: PID + token (0600 mode, 32-byte base64url) + tracked-children files in `$XDG_RUNTIME_DIR`; conflict-resolution prompt via `@inquirer/prompts`; graceful shutdown with SIGTERM → 5s timeout → SIGKILL; status command that shows token preview + tracked children; new Node `http` static server (`packages/cli/src/cli/http-server.ts`) that serves `frontend/dist/` with per-request WS token injection (`<script>window.__SIRENO_TOKEN__ = "..."</script>` inserted before the module script) and a `/health` endpoint; `--http-port` flag on the `start` command (default 3939); HTTP server lifecycle tied to the daemon's signal handler.

## Key files

- `packages/cli/src/util/daemon.ts` — extended `DaemonPaths` with `tokenFile` + `childrenFile`. New: `generateToken` (32 random bytes base64url), `readToken`/`writeToken` (mode 0600 via `openSync` + `fchmodSync`), `readChildren`/`writeChildren`/`removeChildrenFile` (JSON `{ pids: number[] }`).
- `packages/cli/src/cli/http-server.ts` (new) — `startHttpServer({ port, distDir, getToken, logger })` returns `{ port, stop() }`. Reads `index.html` once at startup; injects the token via the live `getToken()` callback on every request. Serves `/assets/*` with content-type by extension. `/health` returns `{ "status": "ok" }`. Path traversal blocked.
- `packages/cli/src/cli/commands/start.ts` — rewritten. Writes pid + token files before launching the pipeline. Tracks children via a callback passed to `runRealModePipeline`. Starts the HTTP server after pipeline launch; stops it on daemon shutdown. Conflict prompt via `@inquirer/prompts` `select({ choices: ["restart", "cancel"] })`. Falls back to throwing if stdin is not a TTY.
- `packages/cli/src/cli/commands/stop.ts` — rewritten. Reads children file; SIGTERMs each child (5s timeout, then SIGKILL); then the daemon. Removes all three files.
- `packages/cli/src/cli/commands/status.ts` — extended. Shows pid status, token preview (first 8 chars + length), tracked-children count + pids.
- `packages/cli/src/cli/commands/run.ts` — added `onChildren?: (pids) => void` to `RunOptions`; `runEmulatorLifecycle` now calls it with `handle.childPids` after `runEmulatorMode` returns.
- `packages/cli/src/cli/commands/emulator-mode.ts` — `EmulatorModeHandle.childPids` populated with `[frontendVite.pid, emulatorVite.pid]` (filtered for >0).
- `packages/cli/src/cli/index.ts` — `--http-port` flag on `start` command, default 3939.

## Decisions made

- **`fchmod` after `openSync(..., "w", 0o600)`** — `writeFileSync` with `mode` option applies the umask, so we can't rely on the mode option alone. Using `openSync` with mode 0o600 + `fchmodSync` to enforce exactly 0600.
- **Children file is plain JSON, not mode-restricted** — operational metadata, not a secret.
- **HTTP server start is non-fatal** — if `index.html` is missing (no `pnpm build`), the daemon logs a warning and continues with the WS bridge + emulator dev path.
- **Token callback (`getToken`) is invoked per request** — supports live rotation; the file is read fresh each time. (Token rotation while running is out of scope per CONTEXT, but the plumbing supports it.)
- **Non-interactive conflict handling** — if `start` detects a running daemon but stdin isn't a TTY, throw a clear error instead of prompting. Prevents broken CI / Docker pipelines.

## Tests added

- `daemon.test.ts` — 15 tests: token round-trip, mode 0600, file-missing returns null, children round-trip, pid filtering, malformed JSON returns null.
- `http-server.test.ts` — 9 tests: serves index, injects token before module script, /assets content-type, /health, 404 for unknown, 403 for traversal, missing-index throws, stop frees port, token rotation per request.
- `stop.test.ts` — 5 tests: no daemon (silent), stale pid (removes), real daemon + 2 children killed, stale daemon + live children, no children tracked.
- `status.test.ts` — 5 tests: not running, stale pid, running + token + children, missing token warning, no children.

Total: **34 new tests** (from 409 → 443).

## Deviations

None. All 10 tasks implemented as planned.

## Notes for downstream

- Plan 10-02 (npm addon loader) needs `cacheDir` passed to `loadAddons`. The `main.ts` flag `--local-node-modules` (planned for 10-02 Task 7) will pass that through.
- The HTTP server reads `index.html` from `<cli>/frontend/dist/`. To enable the prod server in dev, the user must run `pnpm --filter sireno-deck-2-frontend build` once. The current dev path (vite dev on port 5180) is unchanged.
- The `opencode.ai` plugin pattern (used as a reference for 10-02) caches to `~/.cache/opencode/node_modules/`. We mirror that to `~/.cache/sireno-deck-2/node_modules/`.
