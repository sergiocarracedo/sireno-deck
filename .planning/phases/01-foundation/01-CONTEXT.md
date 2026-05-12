# Phase 1: Foundation — Context

**Gathered:** 2026-05-12
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a TypeScript CLI skeleton that loads and validates config.yml and responds to start, stop, status, and --help commands. This phase establishes the project structure, build tooling, config schema, daemon lifecycle, and error UX that all later phases build on.
</domain>

<decisions>
## Implementation Decisions

### Project Structure
- **Monorepo via pnpm workspaces:** packages/sireno-deck (CLI binary), builtin-addons/* (one package per addon). Themes ship as YAML files in the CLI package.
- **Build tool:** tsup (esbuild-powered, dual output via config)
- **Module format:** ESM ("type": "module" in package.json)
- **TypeScript:** strict: true enabled with strictNullChecks, noImplicitAny, strictFunctionTypes
- **Tests:** colocated next to source files (*.test.ts), vitest with glob patterns
- **Binary entry:** tsup outputs to packages/sireno-deck/dist/cli.js; bin points there
- **Workspace protocol:** Builtin addons depend on CLI via `"sireno-deck": "workspace:*"` in their package.json
- **Scripts:** pnpm scripts for dev (tsup --watch), build (tsup), test (vitest), lint (oxlint), format (oxfmt)

### Config Schema Scope
- **Full forward-looking schema defined in Phase 1:** All top-level keys (device, theme, decks, buttons, addons, logging) are defined now with zod schemas. Later phases flesh out sub-keys but the structure is stable.
- **Top-level shape grouped by domain:** `device:`, `theme:`, `decks:`, `addons:`, `logging:`
- **Validation:** zod `.strict()` — rejects unknown keys to catch typos
- **Config discovery:** CWD ./config.yml first, then ~/.config/sireno-deck/config.yml, then --config flag override
- **Zod schemas live in one place:** `src/core/schemas.ts` for all config type definitions

### Daemon Lifecycle
- **Process model:** Foreground process (blocks terminal). `sireno start --daemon` flag backgrounds and writes PID file. Users can also manage with systemd/tmux/screen.
- **Stop mechanism:** PID file + SIGTERM. PID file at `~/.local/state/sireno-deck/daemon.pid`. `sireno stop` reads PID, sends SIGTERM, waits with timeout fallback to SIGKILL.
- **Status check:** Read PID file + `kill(pid, 0)` process check. Reports "running" / "not running" / "stale PID".
- **Graceful shutdown:** On SIGTERM/SIGINT: clear Stream Deck display (write blank image), close device connection, remove PID file, flush pino logs, exit cleanly.

### Error UX + Logging
- **Logger:** pino for structured JSON logging. Use pino-pretty for dev output.
- **Output:** stdout/stderr. User redirects for persistent log files. pino-pretty piping optional.
- **Config error UX:** Colored diff-style errors with file path, line number, expected vs actual, plus "Did you mean [correct key]?" suggestions for common typos.
- **Verbosity:** Quiet by default (startup banner, errors, warnings). `--verbose` flag enables debug logging (config parsing details, device events, polling).

### Agent's Discretion
- Exact YAML key naming conventions within the grouped structure (use `snake_case` for user-facing config keys)
- PID file directory fallback for non-Linux platforms
- pino-pretty formatting style for dev output
- Binary name for the CLI entry point (snake-case, matching package name)
- Detailed zod error-to-colored-message mapping implementation

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- .planning/PROJECT.md — overall project scope and rationale
- .planning/REQUIREMENTS.md — v1 requirements (INFRA-04..09 are Phase 1)
- .planning/research/STACK.md — recommended library versions and rationale
- .planning/research/ARCHITECTURE.md — system structure and build order
- .planning/research/PITFALLS.md — common mistakes to avoid
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing code — this is the first phase, greenfield project

### Established Patterns
- No existing patterns — all conventions are being established in this phase

### Integration Points
- src/core/schemas.ts will be imported by config loader, button types, addon registry, and deck controller in later phases — its design affects the entire project
- packages/sireno-deck/src/cli/commands/ will be extended by future phases with new subcommands
</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---
*Phase: 01-foundation*
*Context gathered: 2026-05-12*
