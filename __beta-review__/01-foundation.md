# 01 — Foundation, Build, CI, Daemon Lifecycle

Scope: repo baseline, build pipeline, CI, version drift, tsconfig/lint/format, daemon lifecycle, PID/token model.

## Findings

### [01-foundation #1] [P0] `pnpm build` is a no-op; SPAs never build
**Evidence:** `packages/cli/package.json:35` script `"build": "echo 'no bundler in phase 0' && exit 0"`; both Vite configs set `assetsInclude: ["**/*.html"]` (`frontend/vite.config.ts:124`, `emulator/vite.config.ts:105`).
**Impact:** No shipped SPA; `pnpm build` exits 0 emitting nothing. A fresh frontend build emits an invalid HTML-as-module stub.
**Effort:** M
**Fix sketch:** Delete `assetsInclude`, add proper Vite SPA build steps, wire `pnpm -r build` to call them, generate dist for both SPAs.
**OSS-impression:** First command a reviewer runs fails silently.

### [01-foundation #2] [P0] No CI configuration exists
**Evidence:** No `.github/`, no `circleci/`, no `.gitlab-ci.yml`.
**Impact:** No enforcement of test/typecheck/lint/format on PRs; any contributor can land broken code.
**Effort:** M
**Fix sketch:** Add `.github/workflows/ci.yml` running `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test` on Linux/macOS/Windows matrix; cache pnpm store.
**OSS-impression:** First PR will likely break; no confidence in green badge.

### [x] [01-foundation #3] [P0] Token is not enforced in the production WS bridge
**Evidence:** `cli/commands/run.ts:1241` calls `startWsBridge({ port: 52937 })` with no `expectedToken`; `ws-bridge.ts:99-105` only validates when token is provided.
**Impact:** Any local process can connect to the daemon's WS without a token; advertised auth model is theatre.
**Effort:** S
**Fix sketch:** Read `expectedToken` from the token file written by `start.ts`, pass it to `startWsBridge`. Make protocol schema require the field in production.
**OSS-impression:** Security model appears broken; reviewers will flag immediately.

### [x] [01-foundation #4] [P0] Token is not propagated to Vite children
**Evidence:** `cli/commands/emulator-mode.ts` forwards `SIRENO_WS_URL`/`SIRENO_FRONTEND_URL`/`SIRENO_THEME_DIR` but not `SIRENO_TOKEN`; both Vite configs default `process.env["SIRENO_TOKEN"] ?? ""`.
**Impact:** Virtual token is always empty in dev/emulator; frontend never sends a token, daemon would reject if it checked.
**Effort:** S
**Fix sketch:** Add `SIRENO_TOKEN` to the env-forwarding list in `emulator-mode.ts`; verify `vite/virtual-modules.ts` reads it.
**OSS-impression:** Dev loop silently runs without auth.

### [x] [01-foundation #5] [P0] `packages/cli/src/index.ts` violates process boundary
**Evidence:** `packages/cli/src/index.ts:31-35` imports `frontend/src/components/Deck`; oxlint has explicit forbidden-import rule; `tsconfig.json` `rootDir: "src"` rejects it.
**Impact:** Lint error + TS error; oxlint forbids cross-process imports. Architectural contract is broken.
**Effort:** S
**Fix sketch:** Remove the public re-export from `src/index.ts`; expose the addon UI library through a dedicated `src/ui/index.ts` only (no `Deck` import).
**OSS-impression:** Boundary violation is the first thing boundary enforcement catches.

### [x] [01-foundation #6] [P0] Version constants contradict each other across files
**Evidence:** `src/version.ts:3` `SIRENO_ADDON_API_VERSION=3`; `src/addon/api.ts:11` and `src/addon/api-types.ts:3` both `=1`; `src/api/protocol-internal.ts:3` `PROTOCOL_VERSION=1`; `src/__tests__/cli.test.ts:16` asserts `===3`; `src/api/__tests__/index.test.ts:12` asserts `===1`.
**Impact:** Runtime uses 1, tests assert 3 and 1 — both pass on dead code; any hand-edit that wires `@/version` will silently bump the addon API and load nothing.
**Effort:** S
**Fix sketch:** Decide one canonical location (recommend `@/version`), delete the others, make tests assert against the single source.
**OSS-impression:** Version mismatch is the textbook sign of half-finished migration.

### [x] [01-foundation #7] [P0] `service-manager.ts` imports a non-existent module
**Evidence:** `cli/commands/service-manager.ts:64` does `await import("./install")`; the file is at `cli/commands/service/install.ts` (different path).
**Impact:** typecheck red (missing module); runtime would throw on first install invocation.
**Effort:** S
**Fix sketch:** Replace with `await import("./service/install.js")` (matching tsconfig output) or inline the small helper.
**OSS-impression:** First beta install attempt crashes.

### [01-foundation #8] [P1] `pnpm typecheck` is broadly red
**Evidence:** ~304 diagnostics across `packages/cli/src/**` (missing modules, missing exports, stale interfaces, rootDir violations).
**Impact:** No one can tell which errors are intentional; merge conflicts invisible.
**Effort:** L
**Fix sketch:** Land the P0 fixes first; treat remaining diagnostics as a backfill issue with one PR per category.
**OSS-impression:** Contributors can't trust the red baseline.

### [01-foundation #9] [P1] Two conflicting formatter configs
**Evidence:** `.oxfmtrc.json` (80 width, no semi) vs `oxfmt.json` (110 width, single quotes, trailing commas). README documents a third convention.
**Impact:** `pnpm format` can rewrite files the other config rejects; CI drift.
**Effort:** S
**Fix sketch:** Pick one (oxfmt.json matches CLI README), delete the other, re-run formatter.
**OSS-impression:** Two configs = no convention.

### [01-foundation #10] [P1] Token storage falls back to `/tmp` when `XDG_RUNTIME_DIR` is absent
**Evidence:** `util/daemon.ts` uses `os.tmpdir()` fallback for pid/token files on Linux.
**Impact:** Predictable world-writable paths; PID/token collision risk across users.
**Effort:** S
**Fix sketch:** Create `${tmpdir}/sireno-deck-${uid}/` with `0700`; refuse to write on EACCES.
**OSS-impression:** A reviewer scanning the daemon code will see this immediately.

### [01-foundation #11] [P1] PID identity check uses `process.kill(pid, 0)` only
**Evidence:** `util/daemon.ts isRunning(pid)` does not verify cmdline; relies on PID existence.
**Impact:** Stale PID + PID reuse → `stop` kills an unrelated process.
**Effort:** M
**Fix sketch:** Read `/proc/<pid>/cmdline` (Linux) or `ps -p <pid> -o comm=` and match a sentinel string the daemon writes (e.g. env marker or argv).
**OSS-impression:** Trust boundary from the first iteration.

### [01-foundation #12] [P1] Runtime metadata writes are not atomic
**Evidence:** `writePid`, `writeChildren`, `writeConfigPath`, `writeFlags` write directly via `fs.writeFileSync` with no tmp+rename.
**Impact:** Crash mid-write leaves partial metadata; restart reads garbage.
**Effort:** S
**Fix sketch:** `writeFileAtomic(path, JSON.stringify(payload), { mode: 0o600 })` (use `write-file-atomic` or hand-rolled `fs.rename`).
**OSS-impression:** Standard reliability expectation; absence is conspicuous.

### [01-foundation #13] [P1] Daemon signal cleanup is split across implementations
**Evidence:** `util/daemon.ts` has `startDaemon/stopDaemon/checkStatus`; `cli/commands/{start,stop,status}.ts` carry the actual production logic.
**Impact:** Two implementations drift; the helpers are dead but not marked so.
**Effort:** M
**Fix sketch:** Delete the helpers in `util/daemon.ts` or refactor commands to use them; add a single round-trip test.
**OSS-impression:** Dead code next to live code looks like a bug.

### [01-foundation #14] [P1] Two concurrent `start` invocations can race
**Evidence:** `cli/commands/start.ts` checks PID file then writes a new one without locking.
**Impact:** Two daemons write pid/token/children files; second loses; orfsan cleanup kills the wrong one.
**Effort:** S
**Fix sketch:** `flock(pidfile)` around the start path; refuse if locked.
**OSS-impression:** Race window is one extra bash prompt away.

### [01-foundation #15] [P1] `killPortListeners` regex is fragile
**Evidence:** `cli/commands/start.ts:106-163` parses `ss -ltnp` output via regex `/:${port}\b[\s\S]*?users:\([^)]*?pid=(\d+)[,\)]/`; silently `catch {}`s when `ss` is missing.
**Impact:** Newer `ss` versions or non-Linux break detection; no `lsof`/`fuser` fallback.
**Effort:** S
**Fix sketch:** Try `ss` → `lsof -iTCP:<port> -sTCP:LISTEN -t` → `/proc/net/tcp` parser in that order; warn if all fail.
**OSS-impression:** First crash on a different distro.

### [01-foundation #16] [P1] `spawn-daemon.ts` log line-by-line `appendFileSync`
**Evidence:** `spawn-daemon.ts:124-152` writes each line with `openSync`+`writeSync`+`closeSync`; parent and child both append without locking.
**Impact:** O(N) syscalls per second on busy daemons; line interleaving under load.
**Effort:** S
**Fix sketch:** Open the log fd once per direction, use a `WriteStream` with `highWaterMark`, and serialize writes through a queue.
**OSS-impression:** Read/write amplification is a smell.

### [01-foundation #17] [P1] `spawn-daemon.ts:resolveInterpreter` tsx fallback drops tsconfig
**Evidence:** `resolveInterpreter` injects `TSX_TSCONFIG_PATH` only on the `tsxBin` path; `--import tsx` fallback uses default resolution.
**Impact:** Alias `@/...` silently breaks when user installs with hoisting disabled.
**Effort:** S
**Fix sketch:** Always set `TSX_TSCONFIG_PATH=<cliRoot>/tsconfig.json` for both paths.
**OSS-impression:** Default-config fallback is the kind of footgun that becomes a top issue.

### [01-foundation #18] [P1] `isOrphan` returns `true` on non-Linux
**Evidence:** `cli/commands/port-identity.ts:84` short-circuits with `return true` when not on Linux.
**Impact:** macOS/Windows: `killPortListeners` SIGTERMs any vite whose cmdline matches; bypasses identity gate.
**Effort:** S
**Fix sketch:** Implement macOS/Windows identity check (e.g. `ps -p <pid> -o command`); return `false` (don't kill) if unknown.
**OSS-impression:** "Works on Linux" is not beta-grade.

### [01-foundation #19] [P2] `commands/run.ts` is 1572 LoC with 11+ top-level exports
**Evidence:** Single file mixes `run`, `runPipeline`, `preflight`, `validateAndLoadConfig`, `setupAddonServices`, `applyConfigErrorReplacements`, `buildAddonConfigOverrides`, `buildExternalScannedAddons`, `buildExternalAddonDirs`, `buildAddonBundle`, `defaultSignals`.
**Impact:** Hard to review, hard to test in isolation, easy to leak state across concerns.
**Effort:** M
**Fix sketch:** Extract one file per export along natural boundaries (e.g. `run-preflight.ts`, `run-orchestrator.ts`, `run-addon-services.ts`).
**OSS-impression:** Longest file in the repo is the orchestration entry point.

### [01-foundation #20] [P2] `runPipeline` uses 17 mutable `let` locals in one try/finally
**Evidence:** `commands/run.ts:1185-1536` declares `let loadedConfig`, `let outputClient`, `let bridge`, etc., null-initialized, mutated through one giant try block.
**Impact:** Classic defer-semantics smell; cleanup is hard to audit.
**Effort:** M
**Fix sketch:** Introduce a small `createScope()` returning `{ defer(fn) }`; collapse cleanup to `scope.flush()`.
**OSS-impression:** A reader sees a 350-line try and gives up.

### [01-foundation #21] [P2] Logger sets process-wide env vars
**Evidence:** `util/logger.ts createLogger` writes `SIRENO_LOG_VERBOSE` and `SIRENO_LOG_JSON` to `process.env`.
**Impact:** Multiple logger instances in one process interfere; test fixtures leak state.
**Effort:** S
**Fix sketch:** Read verbose/json from explicit options or thread a config object; remove the env mutation.
**OSS-impression:** Global env mutation is a classic leak.

### [01-foundation #22] [P2] `logging` in config.yml is parsed but never applied
**Evidence:** `config/schemas.ts` declares `logging` schema; no code reads it; `createLogger` is driven only by CLI flags.
**Impact:** Users set `logging.level: debug` in YAML expecting it to work; nothing happens.
**Effort:** S
**Fix sketch:** In `validateAndLoadConfig` apply `parsed.logging` to `createLogger()` overrides; document precedence.
**OSS-impression:** "It says it works but doesn't" is a top review note.

### [01-foundation #23] [P2] `emulator-mode.ts` magic 1s `setTimeout`
**Evidence:** `cli/commands/emulator-mode.ts:144-148` waits 1000ms after URL regex match before resolving.
**Impact:** Slow machines break; fast machines waste time; no jitter or backoff.
**Effort:** S
**Fix sketch:** Poll the URL with exponential backoff up to 10s; log elapsed.
**OSS-impression:** Magic numbers smell.

### [01-foundation #24] [P2] Service log file has no size rotation
**Evidence:** `cli/commands/start.ts` opens the log once at start; never truncates.
**Impact:** A chatty daemon fills the disk over weeks.
**Effort:** M
**Fix sketch:** Use `pino.destination` with `pino-rotate` or a simple size-based `WriteStream` that rotates at N MB.
**OSS-impression:** Operational concern for a long-running daemon.

### [01-foundation #25] [P2] `ensureInstalled` `--system` flag is ignored
**Evidence:** `service-manager.ts` `invokeManager` always calls `systemctl(true, ...)` (user-level).
**Impact:** System-level install path is not actually wired.
**Effort:** S
**Fix sketch:** Pass `--system` through to `systemctl(...)`; add a test that verifies the flag.
**OSS-impression:** "Half-implemented" is worse than "not implemented."

### [01-foundation #26] [P2] Windows service management is unimplemented
**Evidence:** `service-manager.ts` reports "not supported" on Windows despite strategy mentioning Windows runtime.
**Impact:** No equivalent of `sireno-deck install` on Windows.
**Effort:** L
**Fix sketch:** Either explicitly document "not supported in beta" or implement via `sc.exe` wrapper.
**OSS-impression:** Claimed OS support vs actual is a top credibility hit.

### [01-foundation #27] [P3] No telemetry module
**Evidence:** No telemetry at all.
**Impact:** Either build one or explicitly say "no telemetry."
**Effort:** L
**Fix sketch:** Document the absence; add `SIRENO_TELEMETRY_DISABLED=1` env knob for forward compat.
**OSS-impression:** Reviewers will ask.

### [01-foundation #28] [P3] No `CHANGELOG.md`
**Evidence:** No file at root.
**Impact:** Users cannot tell what changed between betas.
**Effort:** S
**Fix sketch:** Adopt Conventional Commits + `release-please` or hand-write a 0.1.0 entry.
**OSS-impression:** No changelog = project looks unmaintained.

### [01-foundation #29] [P3] No release artifact / packaging script
**Evidence:** No `pkg`, no `ncc`, no `npm pack` flow.
**Impact:** Users must `pnpm install` from source; no binary.
**Effort:** L
**Fix sketch:** Add `pkg` or `@yao-pkg/pkg` build script; produce single-binary distribution.
**OSS-impression:** "How do I install?" is the first FAQ.

### [01-foundation #30] [P4] Various doc typos and stale cross-references
**Evidence:** `README.md` says `pnpm --filter sireno-deck` (wrong name); `AGENTS.md` references missing `docs/STATE.md`.
**Impact:** Minor confusion; visible if reviewer greps.
**Effort:** S
**Fix sketch:** Run a focused pass; update names; create or remove the references.