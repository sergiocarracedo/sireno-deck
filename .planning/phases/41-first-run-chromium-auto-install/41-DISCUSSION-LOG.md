# Phase 41 Discussion Log

**Date:** 2026-06-04
**Phase:** 41 — First-Run Chromium Auto-Install
**Mode:** standard

## Carrying Forward

From v1.4 research (locked):
- Use `playwright install chromium` (no `--with-deps` by default)
- Cache an installed marker under `~/.cache/sireno-deck/`

## Gray Areas Discussed

### 1. Auto-install UX

**Options considered:**
- Prompt with default yes — rejected
- Silent auto-install — rejected
- **Print + auto-install + log** ✅ chosen

**Decision:** Print `Installing Playwright Chromium (~200MB, one-time)...` to stderr, then run install, stream output, write marker on success. No Y/n prompt.

### 2. Detection timing

**Options considered:**
- **Only in `start` and `emulate`** ✅ chosen
- Any command, deferred to first hardware call — rejected
- Lazy on first browser renderer call — rejected (too late to install gracefully)

**Decision:** Check at the very top of `start` and `emulate` command handlers, before hardware connect or browser launch.

### 3. Failure handling

**Options considered:**
- **Clear error + exit 1** ✅ chosen
- Suggest manual commands + exit 1 — deferred (could be added as a follow-up)
- Continue with broken state — rejected

**Decision:** Print categorized error message (network vs permission vs other), exit 1. No automatic retry.

### 4. Skip mechanism

**Options considered:**
- **`--skip-browser-install` flag + `SIRENO_SKIP_BROWSER_INSTALL` env** ✅ chosen
- No skip flag — rejected (CI/docker need it)

**Decision:** Both flag and env var supported. When skip is active, check + install are bypassed; downstream Playwright error will surface normally if Chromium is actually missing.

## Agent's Discretion

- Use `execa` (already a dep) with streaming output vs `execSync`
- Exact wording of the notice and error messages
- Marker file content (version only vs full metadata)
- `SIRENO_BROWSER_PATH` env var (defer to v1.5 unless trivial)

## Deferred Ideas

- `SIRENO_BROWSER_PATH` env var for pre-installed Chromium binaries
- Repair mode for corrupted Chromium installs
- System-deps install (`--with-deps`) — explicitly rejected for v1.4

## Next

`plan-phase 41` — convert these decisions into executable plans.
