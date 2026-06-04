# Phase 41: First-Run Chromium Auto-Install - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect missing Playwright Chromium at the start of `start` and `emulate` commands, print a notice, and auto-install via `npx playwright install chromium`. Do not bundle Chromium. Support skipping the check via flag/env. Clear error and exit 1 on install failure.

</domain>

<decisions>
## Implementation Decisions

### Detection timing
- Check only at the start of `start` and `emulate` commands
- Other commands (`--version`, `--help`, config validate, etc.) do not trigger the browser check
- The check happens BEFORE any hardware connection or browser launch attempt

### Detection method
- Check for the Playwright cache directory and an "installed" marker file
  - Default cache: `~/.cache/ms-playwright/` (Linux), `~/Library/Caches/ms-playwright/` (macOS)
  - Custom cache: read `PLAYWRIGHT_BROWSERS_PATH` env var if set
- The marker file lives under `~/.cache/sireno-deck/chromium-installed` and contains the Playwright Chromium version that's been installed
- If the cache dir exists AND contains a `chromium-*/chrome-linux/chrome` (or platform equivalent) AND the marker file matches the expected version, the check passes
- If any of those are missing, the check fails and install is triggered

### Auto-install behavior
- Print a clear notice to stderr: `Installing Playwright Chromium (~200MB, one-time)...`
- Run `npx playwright install chromium` (NO `--with-deps` by default — that requires root and is opt-in)
- Stream the install output to the user
- On success, write the marker file with the installed version
- On failure, print a clear error and exit 1

### Failure handling
- Network error: print `Failed to download Chromium. Check your network connection.` and exit 1
- Permission error: print `Failed to install Chromium to <path>. Try with --skip-browser-install if you manage the browser yourself.` and exit 1
- All other errors: print stderr from playwright and exit 1
- No automatic retry

### Skip mechanism
- CLI flag: `--skip-browser-install` on `start` and `emulate` commands
- Env var: `SIRENO_SKIP_BROWSER_INSTALL=1` (read anywhere in the process env)
- When skip is active: do NOT check, do NOT install. If Chromium is missing, the next browser launch attempt will fail with a normal Playwright error.

### Agent's Discretion
- Whether to use `execSync` or `spawn` for the install (spawn allows streaming output)
- Exact stderr format of the install notice and error messages
- Where the marker file's content lives (version only vs full metadata)
- Whether to support a `SIRENO_BROWSER_PATH` env var for users who want to point at a pre-installed Chromium binary (defer to v1.5 unless trivially easy)

</decisions>

<specifics>
## Specific Ideas

- **"Print + auto-install + log" UX** was chosen over a prompt because the user wants zero-friction first runs. The notice is enough to inform; no Y/n interaction needed
- **No `--with-deps`** by default — this would require sudo on Linux and the user explicitly chose to keep the install non-privileged
- **Skip flag** is useful for CI, Docker images, and users who manage Chromium themselves via system package manager

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/.planning/research/v1.4/STACK.md` — "Chromium auto-install" section
- `/works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md` — section "first-run UX confuses user when network is slow" + "system-deps install requires sudo"
- `/works/opensource/sireno-deck/.planning/research/v1.4/SUMMARY.md` — recommended Chromium install flow
- `/works/opensource/sireno-deck/.planning/REQUIREMENTS.md` — `BD-03` and `BD-05`
- `/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts` — entry point that needs the check
- `/works/opensource/sireno-deck/packages/cli/src/cli/commands/emulate.ts` — entry point that needs the check

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`execSync` / `execa` already in use** throughout CLI for command execution (see `packages/cli/package.json` for `execa` dep). Use `execa` for the install so output streams
- **yargs config in `cli/index.ts`** — easy to add `--skip-browser-install` flag scoped to `start` and `emulate` only
- **`process.env` checks** are the standard pattern in this codebase for env-var-driven behavior

### Established Patterns
- **Pino logger** in use throughout — log the install start/success/failure with structured fields
- **Execa for subprocess execution** — preferred over `child_process` directly
- **No existing Chromium-detection helper** — Phase 41 introduces it as `packages/cli/src/util/chromium-detect.ts`

### Integration Points
- **`start.ts`** — first line of the command, before hardware connect, run the check
- **`emulate.ts`** — same, before the browser renderer spins up
- **Skip flag wiring** — needs to be a yargs option on both commands; use `global` flag in yargs if both commands need it
- **Marker file** — write to `~/.cache/sireno-deck/chromium-installed`. The CLI also reads from this same location for the check

</code_context>

<deferred>
## Deferred Ideas

- **`SIRENO_BROWSER_PATH` env var** for users with pre-installed Chromium — defer to v1.5 unless trivial
- **Re-check on every run** — current design checks per-invocation. Could cache "checked once" in process state, but per-invocation is fine for v1.4
- **Repair mode** — if Chromium is installed but corrupted, the check passes but launch fails. Future phase could add a `--repair-browser` mode
- **System-deps install (--with-deps)** — deferred; the user explicitly chose not to require root

</deferred>

---
*Phase: 41-first-run-chromium-auto-install*
*Context gathered: 2026-06-04*
