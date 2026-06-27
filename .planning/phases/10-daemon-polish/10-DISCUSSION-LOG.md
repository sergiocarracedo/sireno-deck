# Phase 10 — Discussion Log

**Date:** 2026-06-27
**Mode:** standard
**Participants:** user, opencode

## Areas Discussed

### 1. Daemon lifecycle (R18)

**Q1: How should the daemon manage the WS bridge and vite children?**
Options:
- (A) Track and signal children (recommended) — children.json with PIDs; stop sends SIGTERM, waits 5s, then SIGKILL.
- (B) Detach children, just kill parent — children inherit stdio; die when parent dies.
- (C) Process group (setsid) — single group, kill the group; trickier on Windows.

**User chose:** A (track and signal children).

**Q2: Where should the token file live and what format?**
Options:
- (A) `sireno-deck-2.token` in `$XDG_RUNTIME_DIR`, 0600, 32 random bytes base64url (recommended).
- (B) Same file, 0644 (world-readable).
- (C) Embed in PID file as JSON.

**User chose:** A.

**Q3: What should `start` do if a daemon is already running?**
Options:
- (A) Error: daemon already running (recommended) — non-zero exit, clear message.
- (B) Adopt: kill old, start new.
- (C) Force-kill + start — auto-restart.

**User chose:** "ask user confirmation or exit" — interpreted as: detect existing daemon → prompt via `@inquirer/prompts` "Daemon already running with pid X. [Stop and restart] [Cancel]?".

**Q4: Graceful shutdown timeout?**
Options:
- (A) SIGTERM, wait 5s, then SIGKILL (recommended).
- (B) SIGTERM, wait 10s.
- (C) Immediate SIGKILL.

**User chose:** A.

### 2. npm addon loader (R19)

**Q1: How should addons be installed from npm?**
Options:
- (A) Auto-install to `~/.cache/sireno-deck-2/node_modules/` (recommended).
- (B) Install into the user's project `node_modules/`.
- (C) User pre-installs; CLI just imports.

**User chose:** "as the addon are 3rd party and the most common way to use them is with the bundle, install them in the config folder or in `~/.cache/sirenodeck/node_modules/`. check how opencode does: https://opencode.ai/docs/plugins/ (i don't want the project level)" — primary location `~/.cache/sireno-deck-2/node_modules/`, fallback to `<config-dir>/node_modules/` if user opts in (no project-level by default).

**Q2: Addon config syntax for npm packages?**
Options:
- (A) Bare specifier (recommended).
- (B) Specifier + version.
- (C) Object with source + version.

**User chose:** "1 and 2: if not version set we use the latest" — both A and B supported; bare means latest.

**Q3: How should the CLI know which packages are addons?**
Options:
- (A) Naming convention `sireno-deck-2-addon-*` (recommended).
- (B) Manifest keyword `sireno-deck-2-addon`.
- (C) Any package with a valid addon manifest (no convention).

**User chose:** C (any package with valid manifest).

**Q4: How should addon installation be triggered?**
Options:
- (A) Auto-install on first run, with a cache (recommended).
- (B) Explicit `addons install` subcommand.
- (C) Lazy install on first import.

**User chose:** A.

### 3. Production build + HTTP server (R20 + R10 prod)

**Q1: Which bundler for the frontend?**
Options:
- (A) rolldown (recommended) — already in stack.
- (B) esbuild — faster, simpler.
- (C) vite's own `vite build` — reuses dev bundler.

**User chose:** A (rolldown).

**Q2: How should the prod HTTP server be implemented?**
Options:
- (A) Node's built-in `http` module (recommended) — no new deps.
- (B) Fastify or Express — bigger dep.
- (C) No server; user runs nginx/caddy in front.

**User chose:** A.

**Q3: How to inject the WS token into the static index.html?**
Options:
- (A) `<script>` tag injected before bundle (recommended) — runtime mutation per request, supports per-run rotation.
- (B) `/api/config.json` endpoint fetched at startup.
- (C) Build-time env var baked into bundle.

**User chose:** "the ws token should be different in each run, no a static token generated in build time. which options is better?" — confirmed A (runtime injection).

**Q4: How should the HTTP server be started?**
Options:
- (A) `start` runs the daemon + HTTP server (recommended).
- (B) Separate `sireno serve` subcommand.
- (C) Two subcommands: `daemon` / `web`.

**User chose:** A.

## Areas Delegated to Agent's Discretion

- Default port for the HTTP server (`3939` is a candidate).
- Detection of npm registry mirror / proxy (read from `.npmrc` first, then env).
- Whether the `<script>` injection mutates a cached in-memory `index.html` (faster) or recomputes from disk each time.
- The exact CLI flag for opting into the `<config-dir>/node_modules/` fallback.

## Deferred Ideas (captured in CONTEXT.md)

- Service-manager integration (systemd / launchd / Windows Service).
- Multi-device parallel.
- HTTPS / compression in the HTTP server.
- Hot addon install / uninstall at runtime.
- Token rotation while running.
