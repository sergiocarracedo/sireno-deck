---
phase: 01-scaffold
plan: 01
completed: 2026-06-23
tests_added: 8
tests_total: 8
status: done
---

# 01-SUMMARY — Scaffold

## What was built

Created the pnpm monorepo skeleton: TS 7.0.1-rc + oxlint + oxfmt + vitest + yargs + pino. Hello-world CLI shell with `run`/`start`/`stop`/`status` commands. Daemon PID file helpers in `src/util/daemon.ts` with platform-aware path resolution.

## Files changed

- All root config files (see `01-PHASE.md` for full list)
- `packages/cli/` skeleton + bin/sireno.js + 4 command files
- `packages/cli/src/util/logger.ts`, `packages/cli/src/util/daemon.ts`
- `packages/cli/src/__tests__/cli.test.ts`

## Tests

- 8 tests in `cli.test.ts` covering constants, logger (verbose), daemon paths/pid r/w, status no-throw when no pid.

## Smoke

- `pnpm typecheck` clean
- `pnpm exec vitest run` 8/8 passing
- `pnpm --filter sireno-deck lint` clean
- `node bin/sireno.js --version` works
- `node bin/sireno.js status` works

## Bugs / adjustments

- Initial tsx spawn with `--import tsx/esm` couldn't resolve `@/util/...` paths and extensionless `./run` imports. Fixed by: bin file spawns `node_modules/.bin/tsx` directly + sets `TSX_TSCONFIG_PATH` + chdirs to packages/cli/.
- TS 7.0.1-rc removed `baseUrl` from tsconfig — dropped.
- `verbatimModuleSyntax: true` conflicts with extensionless imports — off.
- `exactOptionalPropertyTypes: true` conflicts with yargs types — off.
- `.ts` extensions required on relative imports in `cli/index.ts`.

## Next

Phase 02 — config-addons. Plan in `02-PHASE.md`.
