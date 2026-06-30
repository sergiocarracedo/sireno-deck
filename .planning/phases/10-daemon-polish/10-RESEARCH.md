---
phase: 10-daemon-polish
status: researched
date: 2026-06-27
---

# Phase 10 — Research

## Bundler (rolldown)

**Decision:** Use `vite build` in `packages/cli/frontend/` to produce `packages/cli/frontend/dist/`. Vite 6+ uses rolldown-vite as the default backend (https://vite.dev/guide/rolldown). This satisfies the CONTEXT.md decision ("rolldown") without adding a new bundler to the stack.

**Confidence: HIGH** — vite 6 is already installed (^6.0.0 in `frontend/package.json`); the `build` script is `vite build` (already exists at `packages/cli/frontend/package.json:6`). Rolldown is the default bundler.

**How it works for us:**

- `pnpm build` runs `vite build` in `packages/cli/frontend/`
- Output: `packages/cli/frontend/dist/index.html` + `dist/assets/*.js,*.css`
- The dev path (vite dev on port 5180) is unchanged
- The prod path uses the static files in `dist/`

## HTTP server (node:http)

**Decision:** New file `packages/cli/src/cli/http-server.ts`. Serves `packages/cli/frontend/dist/` as static files.

**Confidence: HIGH** — `node:http` is built-in. No new deps.

**Key behaviors:**

- Read `index.html` once at startup (or on first request) → cache in memory
- For each request to `/`: read the current token from `$XDG_RUNTIME_DIR/sireno-deck.token`; if found, inject `<script>window.__SIRENO_TOKEN__ = "..."</script>` before the `<script type="module" src="/assets/...">` tag
- For requests to `/assets/*`: stream from `dist/assets/` with correct content-type
- `/health` endpoint returns `{ "status": "ok" }` with HTTP 200
- Bind to `127.0.0.1:<port>` (configurable; default `3939`)

**Caveat:** the `index.html` cache is invalidated only at process restart. If the token rotates while the server runs (out of scope for v0.1, but possible in dev), users would see the stale token until restart. Per the CONTEXT, "Token rotation while running" is out of scope.

## Token storage (file in $XDG_RUNTIME_DIR)

**Decision:** Extend `packages/cli/src/util/daemon.ts` with `writeToken`, `readToken`, `removeTokenFile`. Same directory as the PID file (already cross-platform via `resolveDaemonPaths`).

**Confidence: HIGH** — `daemon.ts` already has `resolveDaemonPaths()` returning `runtimeDir` + `pidFile`. Add `tokenFile`.

**Format:** 32 random bytes from `node:crypto.randomBytes`, base64url-encoded. ~43 characters. File mode `0600`.

**Read on each HTTP request** (no in-memory cache; the file is tiny).

## Child tracking (children.json)

**Decision:** Extend `packages/cli/src/util/daemon.ts` with `writeChildren`, `readChildren`, `removeChildrenFile`. JSON file: `{ pids: number[] }`.

**Confidence: HIGH** — same pattern as the PID file.

**Use case:** when `start` spawns the WS bridge child + vite children, it records their PIDs. When `stop` runs, it reads the file, sends SIGTERM to each, waits 5s, then SIGKILL. If a child has already exited, `kill -0` returns `ESRCH`; treat as success.

## npm addon loader

**Decision:** Replace the stub at `packages/cli/src/addon/loader.ts:186` with a real loader. Use `npm install <name>[@version] --prefix ~/.cache/sireno-deck/`.

**Confidence: HIGH** — `execa` is already a dep (^9.6.0). `npm` is available on all target platforms.

**Pattern (mirrors opencode.ai plugins):**

1. CLI reads `config.yml`. For each addon entry that isn't a local path (no `/`, no `./`, no `~`), treat it as an npm specifier.
2. Compute the install dir: `~/.cache/sireno-deck/node_modules/<name>/`. Check if the package's `package.json` exists there.
3. If not, run `npm install <specifier> --prefix <cache-dir> --no-save --silent` via `execa`. The `--prefix` flag installs into the cache dir; `--no-save` because there's no `package.json` there yet; `--silent` for quiet output.
4. After install, the package is at `<cache-dir>/node_modules/<name>/`. Resolve its `main` field from `package.json` (or `sirenoAddonMain` field if defined) and `import()` it.
5. Validate the addon manifest (apiVersion, name, buttons/decks).

**Cache invalidation:** per-start. The user updates `config.yml`, restarts, picks up the new version. No hot install in v0.1.

**Optional fallback** (`--local-node-modules`): if the user opts in, install to `<config-dir>/node_modules/` instead. Same `npm install --prefix` flow. Out of the box, this is OFF (matches user preference: "i don't want the project level").

## Concurrent start conflict resolution

**Decision:** When `start` detects an existing PID file + alive process, prompt the user via `@inquirer/prompts` (already a dep, ^7.0.0):

```
? Daemon already running with pid 12345. (Use arrow keys)
❯ Stop and restart
  Cancel
```

If "Stop and restart": send SIGTERM to the existing daemon's PID; wait for it to exit (with a 5s timeout, then SIGKILL). Then start a new one. The child-tracking file is also cleaned up.

If "Cancel": exit 0.

**Confidence: HIGH** — `@inquirer/prompts` is already in deps. Existing `daemon.ts` has `isRunning()` to check.

## Graceful shutdown

**Decision:** When the daemon receives SIGTERM (or `stop` is run), it:

1. SIGTERM each tracked child PID (from children.json).
2. Waits up to 5s for each child to exit. Poll every 100ms.
3. SIGKILL any child still alive after 5s.
4. Removes `pid`, `token`, `children` files.
5. Exits 0.

The daemon itself listens for SIGTERM/SIGINT (via `defaultSignals` from `run.ts`) and runs the same shutdown sequence.

**Confidence: HIGH** — `run.ts` already has `defaultSignals.onSignal(...)` registered.

## File layout

```
packages/cli/src/util/daemon.ts             # extended: writeToken, readToken, writeChildren, readChildren, removeChildrenFile
packages/cli/src/cli/commands/start.ts      # rewritten: tracks children, writes token, starts HTTP server
packages/cli/src/cli/commands/stop.ts       # rewritten: reads children, SIGTERMs each, waits 5s, SIGKILLs
packages/cli/src/cli/commands/status.ts     # extended: shows token (truncated) + children
packages/cli/src/cli/http-server.ts         # NEW: node:http static server + token injection + /health
packages/cli/src/addon/loader.ts            # npm loading: install to ~/.cache/sireno-deck/node_modules/ via npm install --prefix
packages/cli/frontend/package.json          # verify "build": "vite build"
```

## Tests (colocated in **tests**)

- `packages/cli/src/util/daemon.test.ts` — token + children file read/write/remove; mode 0600
- `packages/cli/src/cli/http-server.test.ts` — serves index.html with token injected; serves /assets/\* with correct content-type; /health
- `packages/cli/src/cli/commands/stop.test.ts` — SIGTERMs each child PID; SIGKILL after timeout
- `packages/cli/src/addon/loader.test.ts` — npm specifier detection; mock `execa` for install; cached path skip

## Risks

1. **`vite build` may fail on the `sirenoDeck2` plugin** — the plugin writes `.sireno-deck/theme.css` via `configResolved`. In build mode, the cwd is different. Mitigation: pass `outDir` and adjust the plugin's path resolution. Verify with a real `pnpm build`.
2. **`npm install` in `~/.cache` requires network access** — if offline, the install fails. Mitigation: surface the error in `start`'s preflight with a clear message; suggest the local-folder fallback.
3. **Token rotation while running** — out of scope per CONTEXT. Users must restart to rotate.
4. **HTTP server is single-process, single-port** — no clustering. For v0.1 this is fine.
