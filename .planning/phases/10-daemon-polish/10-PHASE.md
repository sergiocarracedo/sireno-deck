---
phase: 10-daemon-polish
status: not-started
depends_on: [04-ws-frontend]
---

# Phase 10 — Daemon + Polish + npm Addons

Goal: real `start/stop/status` implementation, prod HTTP server with token injection, npm addon loader via `require.resolve`, graceful shutdown.

## Outcomes

1. Real `start` command:
   - Generate random token, write to `$XDG_RUNTIME_DIR/sireno-deck-2/token`.
   - Write PID file.
   - Spawn frontend vite (with `SIRENO_TOKEN`) and emulator vite (if `--emulator`).
   - Trap SIGINT/SIGTERM, gracefully shutdown.
2. Real `stop`: read PID file, SIGTERM, remove PID + token files.
3. Real `status`: read PID + token, print state.
4. Prod HTTP server (`src/render/prod-server.ts`) — small Node HTTP server that serves `dist/frontend/` and injects `<script>window.__SIRENO_TOKEN__='…'</script>` into `index.html`.
5. npm addon loader (`src/addon/npm-loader.ts`) — `require.resolve(specifier)`, dynamic import.
6. Graceful shutdown: SIGINT/SIGTERM handler in `src/cli/main.ts`; closes WS bridge, kills spawned processes, removes PID + token files.
7. Rolldown build scripts (`rolldown.config.ts`).
8. Tests for: token roundtrip, prod server token injection, npm loader (mocked), graceful shutdown (mocked process).

## Requirements traceability

- **R18** (daemon start/stop/status + PID/token files + graceful shutdown)
- **R19** (npm addon loader via `require.resolve`)
- **R20** (prod HTTP server injects `window.__SIRENO_TOKEN__` into `index.html`)

## Key files

```
src/render/
  prod-server.ts
  prod-server.test.ts

src/addon/
  npm-loader.ts
  npm-loader.test.ts

src/cli/
  main.ts              # add SIGINT/SIGTERM handlers
  commands/
    start.ts            # real implementation
    stop.ts
    status.ts

build.mjs              # rolldown scripts
rolldown.config.ts
```
