---
phase: 1
slug: foundation
areas_discussed: [Project Structure, Config Schema Scope, Daemon Lifecycle, Error UX + Logging]
created: 2026-05-12
---

# Phase 1: Foundation — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 01-foundation
**Areas discussed:** Project Structure, Config Schema Scope, Daemon Lifecycle, Error UX + Logging

---

## Project Structure

| # | Question | Option A | Option B | Option C | Selected |
|---|----------|----------|----------|----------|----------|
| 1 | Monorepo or single package? | Single package (simpler) | Monorepo/npm workspaces | — | Monorepo (npm workspaces) |
| 2 | Build tool? | tsup (recommended) | tsx + tsc | Vite | tsup |
| 3 | Workspace layout? | CLI + addons split | Core + CLI + addons | Workspaces only for addons | CLI + addons split |
| 4 | TS strictness? | strict: true (recommended) | Moderate | Minimal | strict: true |
| 5 | Module format? | ESM (recommended) | CJS only | Dual | ESM |
| 6 | Test layout? | Colocated (recommended) | __tests__/ dir | tests/ root | Colocated |
| 7 | Addon deps? | Workspace protocol (recommended) | Peer dependency | No dependency | Workspace protocol |
| 8 | Entry + scripts? | Standard npm scripts | pnpm workspaces | npm + turbo | pnpm workspaces |

**User's choice:** Monorepo with pnpm workspaces, tsup build, ESM, strict TS, colocated tests, workspace protocol for addon deps
**Notes:** User showed clear preference for standard modern tooling without over-engineering

---

## Config Schema Scope

| # | Question | Option A | Option B | Option C | Selected |
|---|----------|----------|----------|----------|----------|
| 1 | Schema scope? | Full forward-looking (recommended) | Phase 1 + versioned | Phase 1 only | Full forward-looking schema |
| 2 | Top-level shape? | Grouped by domain (recommended) | Flat | Split files | Grouped by domain |
| 3 | Validation? | Strict — reject unknowns (recommended) | Permissive — ignore | Warn on unknowns | Strict — reject unknowns |
| 4 | File location? | CWD + XDG paths (recommended) | CWD only | --config required | CWD + XDG paths |

**User's choice:** Full forward-looking grouped schema, strict zod validation, CWD + XDG config discovery
**Notes:** User wants the config contract to be stable from the start so later phases don't need to restructure

---

## Daemon Lifecycle

| # | Question | Option A | Option B | Option C | Selected |
|---|----------|----------|----------|----------|----------|
| 1 | Process model? | Foreground + PID file (recommended) | Always daemonize | Foreground only | Foreground + PID file |
| 2 | Stop mechanism? | PID file + SIGTERM (recommended) | Unix socket | HTTP endpoint | PID file + SIGTERM |
| 3 | Status check? | PID + process check (recommended) | PID file only | Process name scan | PID + process check |
| 4 | Graceful shutdown? | Clear display + disconnect (recommended) | Just exit cleanly | Persist state | Clear display + disconnect |

**User's choice:** Foreground by default with --daemon flag, PID file for lifecycle management, SIGTERM for stop, PID-based status, graceful shutdown with device cleanup
**Notes:** User wants standard Unix daemon conventions without over-complicating the architecture

---

## Error UX + Logging

| # | Question | Option A | Option B | Option C | Selected |
|---|----------|----------|----------|----------|----------|
| 1 | Logging library? | pino (recommended) | console.log wrapper | consola | pino |
| 2 | Config error format? | Colored diff (recommended) | Stack trace | JSON report | Colored diff style |
| 3 | Verbosity? | Quiet + --verbose (recommended) | Verbose by default | Three-level | Quiet + --verbose |
| 4 | Log output? | stdout/stderr (recommended) | Always to file | journald | stdout/stderr |

**User's choice:** pino for logging, colored diff for config errors, quiet by default with --verbose flag, stdout/stderr output
**Notes:** Standard CLI convention preferences throughout

---

## Agent's Discretion

- **Exact YAML key naming:** snake_case for user-facing keys, within the grouped structure
- **PID file directory:** XDG-compatible path (~/.local/state/sireno-deck/), with fallback logic on macOS
- **pino-pretty formatting style in dev:** dev script pipes through pino-pretty
- **Binary entry name:** matches npm package naming convention
- **Detailed zod error-to-message mapping:** no need to consult user on exact implementation

## Deferred Ideas

None — discussion stayed within Phase 1 scope.

---
*Phase: 01-foundation*
*Discussion log generated: 2026-05-12*
