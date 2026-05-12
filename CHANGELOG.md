# CHANGELOG

## 2026-05-12

### Features
- Added the initial pnpm workspace, `sireno-deck` CLI package, strict config schema, YAML config loader, shared logger, and lifecycle commands for `start`, `status`, and `stop`.
- Added PID-file daemon lifecycle management with graceful `SIGTERM` / `SIGINT` shutdown handling.

### Fixes
- Fixed config validation so invalid `config.yml` errors retain file path, line number, and actionable suggestions instead of losing context after schema validation.
- Fixed the CLI build output to produce `dist/cli.js`, matching the package binary entry.
- Fixed the manifest to use a real `@types/yargs` version after install failed on the original non-existent range.
- Fixed the daemon start path to use `yargs.parseAsync()` and an actual event-loop keepalive; root cause was that async handlers were returning early and an unresolved promise alone does not keep Node alive.

### Learnings
- Pretty error formatting is useless if metadata gets dropped before rendering; error context has to survive the full parse/validate/load pipeline.
- Verification caught more truth than the plan text alone: install, build, and live lifecycle runs exposed manifest and process-lifetime bugs that static code review would have missed.
- For Node CLIs, async command handlers require async parsing, and foreground daemons need a real event-loop anchor.
