# 04 — Security

Scope: trust boundaries. 14 surfaces (S1–S14) enumerated. Each has explicit intent and a known gap.

## Trust model

Local-process trust. WS bridge and HTTP server bind to `127.0.0.1` only (with one open question on configurability). No remote attack surface; all paths require local code execution. The model is reasonable for a beta but should be documented explicitly.

## Findings

### [x] [04-security #1] [P0] S7 — WS bridge does not enforce the token in production
**Evidence:** `cli/commands/run.ts:1241` starts the bridge without `expectedToken`; `ws-bridge.ts:99-105` only validates when token is provided.
**Impact:** Any local process can connect and send any message.
**Effort:** S
**Fix sketch:** Pass `expectedToken` from the token file written by `start.ts`; make the protocol schema require it in production builds.
**OSS-impression:** Token advertised as security control but not enforced.

### [04-security #2] [P0] S6 — HTTP server exposes raw config, paths, addon metadata
**Evidence:** `cli/http-server.ts` serves `/api/config` (raw YAML including shell commands), `/api/config-path` (filesystem paths), `/api/addons` (addon metadata, paths).
**Impact:** Local processes can read sensitive config (commands, paths) without auth.
**Effort:** M
**Fix sketch:** Require token via `Authorization: Bearer <token>` for `/api/*`; document endpoints in security model.
**OSS-impression:** No auth on any HTTP endpoint — first scan.

### [04-security #3] [P0] S12 — `validateAndLoadConfig` reads YAML from disk via `getOriginalCwd()`
**Evidence:** `config/validateAndLoadConfig` resolves `!include` paths relative to original cwd; `cwd.ts` honors `SIRENO_CWD` env override.
**Impact:** If a user invokes `sireno-deck start` from an attacker-controlled cwd, includes are resolved from there.
**Effort:** S
**Fix sketch:** Disallow `SIRENO_CWD` override unless `SIRENO_ALLOW_CWD_OVERRIDE=1` is set; or resolve includes relative to config file location.
**OSS-impression:** Env-override path is a privilege escalation surface.

### [04-security #4] [P0] S5 — PID file identity is not verified
**Evidence:** `util/daemon.ts isRunning(pid)` uses `process.kill(pid, 0)` only.
**Impact:** PID reuse + stale PID file → `stop` kills an unrelated process.
**Effort:** M
**Fix sketch:** Verify cmdline contains a sentinel string the daemon writes on start (e.g. `argv0=sireno-deck-<pid>-<nonce>`).
**OSS-impression:** Trust boundary without verification.

### [04-security #5] [P0] S8 — Service log opened by parent + child without locking
**Evidence:** `spawn-daemon.ts:124-152` writes line-by-line `appendFileSync`; daemonized child opens the same file.
**Impact:** Line interleaving under load; potentially tampered log on shared account.
**Effort:** S
**Fix sketch:** Open log once with `O_APPEND`; use a write queue; or have only the daemon write to it.
**OSS-impression:** Race window in log integrity.

### [04-security #6] [P1] S14 — Token storage falls back to `/tmp` on Linux
**Evidence:** `util/daemon.ts` uses `os.tmpdir()` when `XDG_RUNTIME_DIR` is absent.
**Impact:** World-writable fallback; token collision risk.
**Effort:** S
**Fix sketch:** Create `${tmpdir}/sireno-deck-${uid}/` with `0700`; refuse on EACCES.
**OSS-impression:** Senior reviewer will spot immediately.

### [04-security #7] [P1] S13 — `installNpmAddon` not pinned to lockfile
**Evidence:** Loader runs `npm install <arbitrary-spec>` against user-supplied addon entries.
**Impact:** Supply-chain risk; later installs can drift.
**Effort:** M
**Fix sketch:** Generate `package-lock.json` in addon dir; verify on subsequent installs.
**OSS-impression:** No pinning is a supply-chain flag.

### [04-security #8] [P1] S2 — `installNpmAddon` accepts arbitrary specs
**Evidence:** Addon entry can be `"somepkg@latest"` or any spec.
**Impact:** Pulls arbitrary code into the daemon's process tree.
**Effort:** M
**Fix sketch:** Require a known registry scope (`@sireno-deck/*` or config-pinned) for beta; or sandbox addon directory.
**OSS-impression:** Unbounded npm install is a top concern.

### [04-security #9] [P1] S3 — Addon dynamic import runs with full Node access
**Evidence:** `addon/loader.ts` uses `await import(path)`; addon code has full `process`/`fs`/`child_process`.
**Impact:** Compromise of any addon = compromise of the daemon.
**Effort:** L
**Fix sketch:** Run addons in a worker_thread with a restricted capability surface; document trust model.
**OSS-impression:** Full-Node addon context is a senior review item.

### [04-security #10] [P1] S4 — `include-resolver` reads arbitrary files
**Evidence:** `config/include-resolver.ts` reads paths from `!include` directives.
**Impact:** A crafted config can include secrets or binaries (though parsed as YAML).
**Effort:** S
**Fix sketch:** Restrict `!include` to a project-relative root; reject absolute paths and `..` traversal.
**OSS-impression:** Path traversal is a textbook vuln class.

### [04-security #11] [P1] S11 — `addon-handler-bridge` runs `onLoad`/`onUnload` with full addon permissions
**Evidence:** Lines 363-377; ctx passed to unload is a stub (`publish: () => {}`), but `onLoad` receives the real ctx.
**Impact:** An addon in `onLoad` can register anything and never be cleaned up across hot-reload.
**Effort:** L
**Fix sketch:** Pass a capability-restricted `loadCtx`; bound network, fs, child_process.
**OSS-impression:** No capability gating for addon lifecycle.

### [04-security #12] [P1] S1 — `runCommand` shells via `/bin/sh -c <user-config>`
**Evidence:** `action/executor.ts:79` `execa("/bin/sh", ["-c", command])`; `methods.runCommand` is a thin pass-through.
**Impact:** Intentional command execution; the user writes shell into config and it runs. No allowlist, no dry-run, no audit log.
**Effort:** M
**Fix sketch:** Log every `runCommand` invocation (addon + command + args) to a separate audit log; document the trust model.
**OSS-impression:** Intentional shell is acceptable if visible; "silent exec" is not.

### [04-security #13] [P1] S9 — Windows key-macro PowerShell injection surface
**Evidence:** `key-macro/windows.ts` builds PowerShell scripts via string template + `EncodedCommand`.
**Impact:** The escape is correct for ASCII, but `escapeForPSDoubleQuote` semantics are inconsistent (see 03-system-providers #11).
**Effort:** M
**Fix sketch:** Use single-quoted PowerShell strings with single-quote escape only; add fuzz tests.
**OSS-impression:** Shell-in-PowerShell footgun.

### [04-security #14] [P1] S10 — Windows clipboard PowerShell injection
**Evidence:** `clipboard/windows.ts:47-52`; same double-quote escape bug as S9.
**Impact:** `Set-Clipboard` payload can be misinterpreted.
**Effort:** S
**Fix sketch:** Switch to single-quoted strings.
**OSS-impression:** Same family as S9.

### [04-security #15] [P2] WS bridge is bindable to non-loopback
**Evidence:** `ws-bridge.ts:44` defaults `127.0.0.1` but `options.host` is honored.
**Impact:** A misconfigured call could expose on `0.0.0.0`.
**Effort:** S
**Fix sketch:** `assertLoopback(host)` in `startWsBridge`; throw on non-loopback unless an explicit `allowRemote` flag is set.
**OSS-impression:** Default-deny is the right posture.

### [04-security #16] [P2] Origin validation absent on WS handshake
**Evidence:** `ws-bridge.ts` accepts any origin.
**Impact:** A misbehaving webview can hijack.
**Effort:** S
**Fix sketch:** Validate `Origin` header against loopback URLs only.
**OSS-impression:** Standard browser-side concern.

### [04-security #17] [P2] Token length is `randomBytes(32)`
**Evidence:** `util/daemon.ts` generates 32 random bytes for the token.
**Impact:** Fine; but token file permissions are not always `0600` (only PID/token explicitly set).
**Effort:** S
**Fix sketch:** Audit `chmod` calls; ensure all metadata files are `0600`.
**OSS-impression:** Permissions hygiene.

### [04-security #18] [P2] No CSRF protection on HTTP `/api/*` (loopback)
**Evidence:** `http-server.ts` accepts any method on `/api/*`.
**Impact:** If a malicious page can navigate to `http://127.0.0.1:3939/api/config` it can read the response.
**Effort:** S
**Fix sketch:** Require `Authorization: Bearer <token>` for `/api/*` (covers S6 too).
**OSS-impression:** Bearer-on-loopback is standard.

### [04-security #19] [P2] Hot-reload path can leak addon secrets
**Evidence:** `run.ts:1417-1484` re-imports external addons each reload; previous bridge's `addonServices` map is not disposed.
**Impact:** Memory + handle accumulation; potential fd leak.
**Effort:** M
**Fix sketch:** Dispose previous bridge before importing new (see 02-architecture #3).
**OSS-impression:** Leak via lifecycle is a senior concern.

### [04-security #20] [P2] Logger redaction limited to `err.raw`
**Evidence:** `util/logger.ts`; no redaction of command output, addon config payloads.
**Impact:** If a user puts an API key in a `runCommand`, it lands in logs.
**Effort:** M
**Fix sketch:** Provide a redaction list (env-var names, key patterns); test with example.
**OSS-impression:** Logged secrets are an OSS deal-breaker.

### [04-security #21] [P2] Addon `onUnload` runs in daemon process
**Evidence:** `addon-handler-bridge.ts:363-377`; no sandbox.
**Impact:** Untrusted unload code can `process.exit(0)`.
**Effort:** L
**Fix sketch:** Worker-thread isolation; or contract that addons must not exit.
**OSS-impression:** Untrusted unload = untrusted daemon.

### [04-security #22] [P3] No rate limiting on WS handshake
**Evidence:** `ws-bridge.ts` accepts any connection rate.
**Impact:** Local DoS possible.
**Effort:** S
**Fix sketch:** Token bucket per source IP (loopback, but still bounded).
**OSS-impression:** Minor at loopback.

### [04-security #23] [P3] No subresource integrity for bundled frontend
**Evidence:** `frontend/dist/` static assets have no SRI hash in `index.html`.
**Impact:** If dist is corrupted/replaced, browser runs whatever was injected.
**Effort:** S
**Fix sketch:** Vite plugin to inject SRI.
**OSS-impression:** Modern browsers warn without SRI.

### [04-security #24] [P3] No CSP on injected HTML
**Evidence:** `http-server.ts` injects `window.__SIRENO_TOKEN__` but no CSP header.
**Impact:** XSS via addon-injected assets is possible (no protection).
**Effort:** S
**Fix sketch:** Strict CSP; allow only inline-scripted token injection.
**OSS-impression:** No CSP = no defense in depth.

### [04-security #25] [P3] Addon loader accepts paths under user `addons[]`
**Evidence:** Loader reads `addons[i].src` without path restriction.
**Impact:** Path traversal in `addons[]`.
**Effort:** S
**Fix sketch:** Restrict to project dir or `~/.config/sireno-deck/addons/`.
**OSS-impression:** Path inputs are untrusted.

### [04-security #26] [P4] Process env not pruned before exec
**Evidence:** `executor.ts` does `execa(...)` inheriting env.
**Impact:** Secrets in `process.env` flow to child processes.
**Effort:** S
**Fix sketch:** Prune to a known set before exec.
**OSS-impression:** Env hygiene.