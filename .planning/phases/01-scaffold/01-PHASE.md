---
phase: 01-scaffold
status: done
completed: 2026-06-23
---

# Phase 01 — Scaffold

Goal: establish a pnpm workspace with TypeScript 7.0 RC, oxlint + oxfmt, vitest, yargs CLI surface, pino logger, and daemon PID helpers. Hello-world `sireno --version` + `sireno status` working end-to-end.

## Files created

### Root

- `package.json` — workspace root, scripts, dev deps
- `pnpm-workspace.yaml` — `packages: ['packages/*']`, `onlyBuiltDependencies: [esbuild]`
- `.npmrc` — shamefully-hoist, strict-peer-deps=false, auto-install-peers
- `.gitignore` — node_modules, dist, coverage
- `tsconfig.base.json` — TS 7.0.1-rc target, ES2022 + ES2023 + DOM, strict + noUncheckedIndexedAccess
- `oxlint.json` — import + typescript plugins, no-restricted-imports for cross-folder
- `oxfmt.json` — 2-space, single-quote, no-semi, trailing-comma all, 110 width
- `vitest.config.ts` — node env, `@` alias → `packages/cli/src`

### packages/cli

- `package.json` — name `sireno-deck`, version 0.1.0, bin `sireno` → `./bin/sireno.js`, exports `.` `./api` `./react` `./vite`
- `tsconfig.json` — extends base, `paths: { "@/*": ["./src/*"] }`, types node
- `bin/sireno.js` — spawns `node_modules/.bin/tsx` with `TSX_TSCONFIG_PATH` + cwd=packages/cli/
- `.gitignore`

### packages/cli/src

- `version.ts` — `PACKAGE_NAME`, `SIRENO_ADDON_API_VERSION = 3`, `PROTOCOL_VERSION = 3`
- `index.ts` — public exports
- `util/logger.ts` — `createLogger({ level?, verbose? })`
- `util/daemon.ts` — `resolveDaemonPaths`, `readPid/writePid/removePidFile`, `isRunning`, `startDaemon/stopDaemon/checkStatus`
- `cli/main.ts` — argv parser, dispatches to commands, top-level error handler
- `cli/index.ts` — yargs command registry (run/start/stop/status)
- `cli/commands/run.ts` — placeholder (warn + log)
- `cli/commands/start.ts` — placeholder, imports `run.ts`
- `cli/commands/stop.ts` — calls `checkStatus` then `stopDaemon`
- `cli/commands/status.ts` — calls `checkStatus`
- `__tests__/cli.test.ts` — 8 vitest tests

## Decisions locked this phase

- **TS version**: 7.0.1-rc (RC; may need to upgrade)
- **Bundler placeholder**: rolldown (deferred to Phase 10)
- **Logger**: pino 9 with pino-pretty 13
- **Daemon**: PID file in `$XDG_RUNTIME_DIR` on Linux, platform-appropriate elsewhere

## Smoke checks

- `pnpm typecheck` → clean
- `pnpm exec vitest run` → 8/8 passing
- `pnpm --filter sireno-deck lint` → 0 warnings, 0 errors
- `node bin/sireno.js --version` → `sireno-deck`
- `node bin/sireno.js --help` → shows all 4 commands
- `node bin/sireno.js status` → JSON log `daemon is not running`

## Outstanding

- Root-level `pnpm lint` OOMs in this env. Workaround: per-package lint works fine.
- Sub-path exports `./api` `./react` `./vite` point at non-existent files (Phase 04 work).

## Traceability

No requirements (infrastructure phase).
