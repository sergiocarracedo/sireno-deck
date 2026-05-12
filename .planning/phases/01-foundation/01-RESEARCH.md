# Phase 1: Foundation — Research

**Researched:** 2026-05-12
**Phase goal:** Ship a TypeScript CLI skeleton that loads and validates config.yml and responds to start, stop, status, and --help commands.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| CLI argument parsing | yargs ^18 | Type-safe commands with positional args, help generation, completion scripts. Better than minimist or hand-parsed process.argv | [VERIFIED: yargs GitHub, 11.5k stars] |
| YAML config parsing | js-yaml ^4.1 | Battle-tested YAML 1.2 parser; 6.6k stars; simple API | [VERIFIED: js-yaml GitHub] |
| Schema validation | zod ^3.x | TypeScript-first schema validation with `.strict()` mode for rejecting unknown keys; infer types from schemas | [VERIFIED: official docs] |
| TypeScript bundling | tsdown ^0.22 | Replacement for tsup (unmaintained). Powered by Rolldown + Oxc for fast builds. Compatible with tsup's configuration schema. Seamless migration | [VERIFIED: tsdown GitHub, 3.9k stars; tsup README explicitly recommends tsdown] |
| Structured logging | pino ^9.x | Fast structured JSON logger; standard for Node.js CLIs | [ASSUMED — well-established standard] |
| Process execution | execa ^9.x | Better child process handling than raw child_process; streaming, timeout, error handling | [ASSUMED — project research already validated] |
| PID file lifecycle | built-in Node.js (fs + process) | No library needed. Write PID to file on start, read and kill(pid,0) for status, read + SIGTERM for stop. ~30 lines total | [ASSUMED — standard Unix daemon pattern] |

## Common Pitfalls

### tsup is unmaintained — user chose it during discuss-phase
**What goes wrong:** The user agreed to tsup during discuss-phase, but tsup is no longer actively maintained (README says "not actively maintained anymore, use tsdown instead"). If we build with tsup, we start with deprecated tooling.
**Why:** tsup's maintainer (egoist) moved on to tsdown in late 2025.
**How to avoid:** Use tsdown instead. tsdown is compatible with tsup's config and migration path is smooth. Flag this to the user during plan review so they can confirm the switch.

### ESM import path issues in Node.js CLIs
**What goes wrong:** ESM requires explicit `.js` extensions in relative imports, or package.json `"type": "module"`. Many Node.js libraries still ship CJS-only or dual. Mixing ESM/CJS causes resolution errors.
**Why:** Node.js ESM resolution is stricter than CJS require().
**How to avoid:** Set `"type": "module"` in package.json. Use `.js` extensions in relative imports (tsup/tsdown will resolve .ts → .js). For dual-format libraries, use the `exports` field in package.json to specify CJS/ESM entry points.

### pnpm workspace resolution order
**What goes wrong:** pnpm resolves workspace packages by version range match. If a workspace package version matches the dependency range, it links from workspace. If not, it downloads from registry. This can cause unexpected behavior when developing addons alongside the CLI.
**Why:** This is pnpm's default behavior for better compatibility, but it's confusing in development.
**How to avoid:** Use `"workspace:*"` protocol for all cross-package dependencies within the monorepo. This ensures pnpm always uses the local version. Before publishing, `workspace:*` is automatically replaced with the actual version.

### PID file race conditions (daemon)
**What goes wrong:** Multiple `sireno start` calls create duplicate daemons if the PID file isn't checked atomically. Stale PID files from crashes cause "already running" false positives.
**Why:** File operations are not atomic without proper locking; crash can leave stale PID files.
**How to avoid:** Check `kill(pid, 0)` on the read PID before claiming "running". On start, write PID after fork/daemonize, not before. Use `mkdir` with `fs.mkdtemp()` in the PID directory as a poor-man's lock (atomic directory creation). Clean PID file only on graceful shutdown, not in error paths (preserve diagnostic info).

### Zod .strict() blocking valid config evolution
**What goes wrong:** Phase 1 defines the full forward-looking schema with strict mode. When later phases add new sub-keys that weren't anticipated, strict mode silently rejects them — producing confusing "unknown key" errors for users who update config.yml before updating the CLI.
**Why:** Strict mode rejects any key not in the schema. If the schema defined `device:` but didn't anticipate a `device.refresh_rate` key, the user can't add it without also updating the schema in the same release.
**How to avoid:** Define the schema with enough flexibility during key discussion points. Use `.strict()` at the top level to catch typos (`theme` vs `thme`) but consider `.passthrough()` or explicit union schemas for nested sections that will grow. Or, commit to updating the zod schema and CLI version in lockstep — users must update CLI before adding new config keys.

## Existing Patterns in This Codebase

- **No existing code — greenfield project.** All patterns will be established in this phase. Key patterns to establish:
  - Zod schemas in `src/core/schemas.ts` — importable by all future phases
  - yargs command module pattern in `src/cli/commands/` — one file per subcommand
  - pino logger setup — a shared logger instance exported from `src/util/logger.ts`
  - Error formatting utility — handles colored diff-style YAML/zod errors consistently

## Recommended Approach

Phase 1 should establish the entire project skeleton as a pnpm monorepo: root workspace config, root tsconfig (strict), `packages/sireno-deck` as the CLI binary package, and `builtin-addons/` as the container for first-party addons. Build with tsdown (not tsup, which is unmaintained — flag this for user confirmation since tsup was the discuss-phase choice). The CLI binary uses yargs with dedicated command files (`start.ts`, `stop.ts`, `status.ts`). Config loading is the core deliverable: define the full forward-looking schema in `src/core/schemas.ts` using zod with strict mode, parse config.yml via js-yaml at startup, and implement the CWD → XDG → `--config` discovery chain. Daemon lifecycle uses PID file + SIGTERM (simple, no extra deps). Logging via pino with colored error formatting for config validation failures. All code in strict TypeScript with colocated tests.
