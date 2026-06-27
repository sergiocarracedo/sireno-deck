# Phase 10: daemon-polish - Context

**Gathered:** 2026-06-27
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the production daemon lifecycle (`start`/`stop`/`status` real impl), an npm addon loader (auto-install + cache), and a production HTTP server that serves the bundled frontend with per-run token injection. Replaces the dev-only `vite dev` + `SIRENO_TOKEN` env path with a single self-contained `pnpm build && sireno start` flow.

Closes R10 (prod side), R18, R19, R20.

</domain>

<decisions>
## Implementation Decisions

### R18 — Daemon lifecycle

- **Child tracking**: track WS bridge + vite child PIDs in `sireno-deck-2.children.json` alongside the PID + token files. `stop` SIGTERMs each tracked child, waits 5s, then SIGKILL.
- **Token storage**: single `sireno-deck-2.token` file in `$XDG_RUNTIME_DIR` (or platform equivalent), 32 random bytes base64url-encoded, file mode `0600`. The daemon writes it at `start`; the HTTP server reads it per request.
- **Concurrent start**: `start` detects an already-running daemon (PID file + process alive) and prompts the user via `@inquirer/prompts`: "Daemon already running with pid X. [Stop and restart] [Cancel]?". No silent force-kill.
- **Stop timeout**: SIGTERM, wait 5s, then SIGKILL. Applies to daemon and to all tracked children.

### R19 — npm addon loader

- **Install location**: addons are installed to `~/.cache/sireno-deck-2/node_modules/` (primary), with a fallback to `<config-dir>/node_modules/` if the user opts in. Pattern follows opencode.ai plugins.
- **Config syntax**: bare specifier → latest version; specifier with `@<range>` → pinned version. Examples:
  ```yaml
  addons:
    - sireno-deck-2-addon-emoji        # latest
    - sireno-deck-2-addon-weather@^1.0.0  # pinned
  ```
- **Addon detection**: any npm package with a `sirenoAddonApiVersion` field in its `package.json` is treated as an addon. No naming convention enforced. Backward compatible with the existing local-folder addons.
- **Install timing**: auto-install on first `start` or `run`. Idempotent. Cache the result in `~/.cache/sireno-deck-2/node_modules/` so subsequent runs are fast.

### R20 + R10 prod — Production build + HTTP server

- **Bundler**: rolldown. `pnpm build` bundles the CLI + the frontend (the existing `packages/cli/frontend/` vite app) into a single `dist/` directory.
- **HTTP server**: Node's built-in `http` module. Serves `dist/frontend/` as static files. Adds a `/health` endpoint. No HTTPS, no compression (the user can put a reverse proxy in front).
- **Token injection**: at request time, the server reads the current token from `$XDG_RUNTIME_DIR/sireno-deck-2.token` and injects `<script>window.__SIRENO_TOKEN__ = "..."</script>` before the bundle's `<script>` tag in `index.html`. This is a runtime mutation (in-memory copy served on each request), so the token rotates freely per `start` without rebuilding.
- **Server lifecycle**: `start` runs the daemon (WS bridge + children) AND the HTTP server in the same process. `stop` kills both. No separate `serve` subcommand in v0.1.

### Agent's Discretion

- The HTTP server's default port (`3939` is a candidate) and whether it should accept a `--port` flag.
- How to detect the npm registry mirror / proxy (read from `.npmrc` first, then `process.env`).
- Whether the `<script>` injection mutates a cached in-memory `index.html` (faster, no disk I/O per request) or recomputes from disk each time (always-fresh, but slower).
- The exact CLI flag for opting into the `<config-dir>/node_modules/` fallback (e.g., `--local-node-modules`).

</decisions>

<specifics>
## Specific Ideas

- The npm addon loader should look at opencode.ai's plugin system for inspiration on cache layout and install UX.
- The HTTP server should be tiny — `node:http` only. The user is happy with no extra dependencies for this.
- The user wants the WS token to rotate per `start` (no static build-time token). The runtime-mutated HTML approach (option A in the discussion) is what makes this work.
- The user wants the same `start` command to bring up both the WS bridge (daemon) and the HTTP server — no separate `sireno serve` in v0.1.

## No specific requirements — open to standard approaches

- The shape of the `/health` endpoint (just `{ "status": "ok" }` is fine).
- The exact token encoding (base64url, 32 random bytes is the default; can be longer if needed for security margins).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/util/daemon.ts` — existing `resolveDaemonPaths`, `writePid`, `readPid`, `isRunning`, `removePidFile`. Will be extended (not replaced) with `writeToken`, `readToken`, `writeChildren`, `readChildren`, `removeChildren`.
- `packages/cli/src/cli/commands/start.ts`, `stop.ts`, `status.ts` — existing daemon command stubs. Will be rewritten to track children, prompt on conflict, and use the new daemon util functions.
- `packages/cli/src/addon/loader.ts` — currently has a stub at line 186: `"npm addon loading is not yet implemented"`. Will be replaced with a real loader that uses `npm install` (or `pnpm add`) child-process to install to `~/.cache/sireno-deck-2/node_modules/`.
- `packages/cli/src/vite/virtual-modules.ts` — currently emits `virtual:sireno/token` from `SIRENO_TOKEN` env (dev path). Will be kept as the dev path; the prod path is the HTTP server's runtime HTML injection.
- `packages/cli/package.json` — current `"build": "echo 'no bundler in phase 0' && exit 0"`. Will be replaced with a real rolldown build.
- `.planning/PROJECT.md` R10, R18, R19, R20 — the four requirements this phase closes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/util/daemon.ts` — `resolveDaemonPaths()` (cross-platform XDG / Library / LocalAppData), `writePid`, `readPid`, `isRunning`, `removePidFile`. Extend, don't replace.
- `@inquirer/prompts` — already a dep. Use for the conflict-confirmation prompt.
- `node:http` — built-in. Use for the prod server.
- `node:crypto` — built-in. Use for the 32-byte random token.

### Established Patterns
- **Sub-path exports** (`.`, `./api`, `./react`, `./vite`): the bundler must produce a `sireno-deck-2/react` entry for the frontend bundle.
- **WS protocol v3 with token handshake**: the `hello`/`hello-ack` is already implemented in `ws-bridge.ts`. The prod path reuses it; the only change is where the token comes from.
- **Vite plugin (`sirenoDeck2`)**: the dev path uses it; the prod path doesn't. The plugin's `configResolved` hook writes the theme CSS to a file. The prod build needs to also bundle the addon frontends (phase 12 work, not this phase).

### Integration Points
- `start` command → spawn WS bridge child + vite child → write pid/token/children files → start HTTP server.
- `stop` command → read children file → SIGTERM each → wait 5s → SIGKILL → remove files.
- `status` command → read pid file + token file + children file → show all three.
- `run` command (no daemon) → no pid/token/children files; just run inline. (Already works.)
- HTTP server → reads token file per request → injects `<script>` into a cached copy of `index.html` → serves.

</code_context>

<deferred>
## Deferred Ideas

- **Service-manager integration** (systemd / launchd / Windows Service) — explicitly out of scope for v0.1 per PROJECT.md. Future phase.
- **Multi-device parallel** — out of scope for v0.1 per PROJECT.md. Future phase.
- **HTTPS / compression in the HTTP server** — out of scope. The user can put a reverse proxy in front.
- **Hot addon install / uninstall at runtime** — out of scope for v0.1. `start` is the install boundary; the user restarts to pick up new addons.
- **Token rotation while running** — out of scope. The user restarts to rotate. (The token still rotates per `start`, but no live rotation.)

</deferred>

---

*Phase: 10-daemon-polish*
*Context gathered: 2026-06-27*
