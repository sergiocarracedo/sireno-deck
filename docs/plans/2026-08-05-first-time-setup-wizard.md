---
title: First-time setup wizard
status: implementation-ready
created: 2026-08-05
---

# First-time setup wizard

## Goal

A discoverable, interactive `sirenodeck system-requirements` command that detects OS, probes system capabilities, prompts per-installation-step, runs selective sudo for fixes after explicit confirmation, seeds the default config, and exits cleanly. Auto-launches on first `start` if requirements are missing.

## Triggers

- **Explicit**: `sirenodeck system-requirements`
- **First-run auto-launch**: `sirenodeck start` with missing config OR unmet requirements, TTY only.
- **Non-TTY**: prints summary of missing pieces and exits non-zero.

## Behavior (interactive flow)

1. **Detect platform** — `process.platform`, `WAYLAND_DISPLAY` / `XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP`, package manager via `command -v`.
2. **Probe** — extend `checkRequirements()` with:
   - Active-app deps (xdotool/xprop on X11, GNOME extension on Wayland, AppleScript on darwin, PowerShell on win32).
   - Udev rules presence (`/etc/udev/rules.d/70-sireno-deck.rules`) AND `lsusb` for the 8 PIDs.
   - Config-file existence at `${xdgConfigHome}/sireno-deck/config.yml`.
3. **Present plan** — table of detected issues + proposed fixes.
4. **Per-step confirmation** — `select` prompt per issue: Install / Skip / Show instructions. Default **Skip** (safe).
5. **Selective sudo** — only when user confirms an install step. Probe `sudo -n true`; if NOPASSWD, stream password from stdin guarded by TTY check. Refuse to elevate in non-TTY.
6. **Config seed** — if config missing, prompt: copy `packages/cli/config/default-config.yml` → `${xdgConfig_HOME}/sireno-deck/config.yml`. Default Y on first run.
7. **Summary** — list of installed / skipped / manual-only.

## OS-specific install mapping

| Capability                | Linux (apt)                                                                                               | Linux (dnf)    | Linux (pacman) | Darwin                 | Win32                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- | -------------- | ---------------------- | --------------------- |
| keyMacro                  | `ydotool`                                                                                                 | `ydotool`      | `ydotool`      | built-in (osascript)   | built-in (powershell) |
| clipboard (Wayland)       | `wl-clipboard`                                                                                            | `wl-clipboard` | `wl-clipboard` | `pbcopy` (built-in)    | `clip.exe` (built-in) |
| clipboard (X11)           | `xclip` (+ xsel fallback)                                                                                 | `xclip`        | `xclip`        | —                      | —                     |
| notification              | `libnotify-bin`                                                                                           | `libnotify`    | `libnotify`    | `osascript` (built-in) | PowerShell (built-in) |
| active-app (X11)          | `xdotool x11-utils`                                                                                       | `xdotool`      | `xdotool`      | —                      | —                     |
| udev rules                | heredoc to `/etc/udev/rules.d/70-sireno-deck.rules` + `udevadm control --reload-rules && udevadm trigger` | same           | same           | —                      | —                     |
| GNOME extension (Wayland) | print link (cannot auto-install)                                                                          | same           | same           | —                      | —                     |

If no supported package manager is found: print instructions, exit non-zero.

## Implementation units

### A — `packages/cli/src/system/setup-wizard/`

Pure logic module, takes `(platform, env, executor, fsProbe)`. Exports:

- `probeAll(...)` → `SystemReport` (capabilities + udev + config).
- `buildInstallPlan(report, platform)` → `InstallStep[]` (each step: `{ capability, packageManager, packageNames, sudo, manualOnly, verifyCommand }`).
- `formatSummary(report, plan)` → string for non-TTY output.
- `formatInstallInstructions(steps)` → string for "show me what to do".

### B — `packages/cli/src/cli/commands/system-requirements.ts`

Yargs handler. Implements:

- Non-TTY branch: `formatSummary` → stdout, exit 1 if any missing.
- TTY branch: `select` prompts per InstallStep, `confirm` for config seed.
- `sudoRun(cmd)` helper: `sudo -n true` → no password needed; else `sudo -S` reads password from TTY stdin (only if `process.stdin.isTTY`).
- macOS: `brew install` for missing formulas (no sudo). Detect via `command -v brew`.
- `--yes` flag batch-accepts prompts (still respects elevation).

### C — `packages/cli/src/cli/index.ts` registration

Add `systemRequirements` to `buildCli()` commands array. Strict-mode-safe flags: `--yes`, `--no-config`, `--non-interactive`.

### D — `packages/cli/src/cli/commands/start.ts` first-run hook

Pre-start guard:

```
const missingConfig = !existsSync(configPath)
const unmet = await checkRequirements(...)
if (missingConfig || unmet.length) {
  if (process.stdin.isTTY) {
    const run = await confirm({ message: 'Run setup wizard?', default: true })
    if (run) await execa('node', [process.argv[1], 'system-requirements'], { stdio: 'inherit' })
  }
  if (stillMissing) { printSummary; exit 1 }
}
```

Re-check after the wizard returns; only proceed to daemon start if requirements now met.

### E — `packages/cli/src/system/setup-wizard/config-seed.ts`

Copies `packages/cli/config/default-config.yml` (created at impl time — copy from repo-root `config.yml`) to `${xdgConfigHome}/sireno-deck/config.yml`. Creates parent dirs. Overwrites only with explicit `--yes` + confirm.

### F — Tests

- `packages/cli/src/system/setup-wizard/__tests__/probe.test.ts` — matrix: linux+wayland, linux+x11, linux+x11-no-gnome, darwin, win32, each with all-tools-present / key-tool-missing.
- `packages/cli/src/system/setup-wizard/__tests__/plan.test.ts` — install plan derivation per platform.
- `packages/cli/src/system/setup-wizard/__tests__/format.test.ts` — summary and instructions output.
- `packages/cli/src/cli/commands/__tests__/system-requirements.test.ts` — yargs registration, non-TTY exits 1, no-arg happy path with mocked executor.
- `packages/cli/src/cli/commands/__tests__/start.test.ts` — first-run hook fires (or doesn't) under each combination.

## Files to create / modify

**New**

- `packages/cli/src/system/setup-wizard/index.ts`
- `packages/cli/src/system/setup-wizard/probe.ts`
- `packages/cli/src/system/setup-wizard/plan.ts`
- `packages/cli/src/system/setup-wizard/format.ts`
- `packages/cli/src/system/setup-wizard/config-seed.ts`
- `packages/cli/src/system/setup-wizard/sudo.ts`
- `packages/cli/src/system/setup-wizard/types.ts`
- `packages/cli/src/cli/commands/system-requirements.ts`
- `packages/cli/config/default-config.yml` (copy of repo-root `config.yml` at impl time)
- Co-located `__tests__/` files for each.

**Modified**

- `packages/cli/src/cli/index.ts` — register `systemRequirements` in `buildCli()`.
- `packages/cli/src/cli/commands/start.ts:541` — add first-run preflight above this line.
- `packages/cli/src/system/requirements.ts` — extend `checkRequirements()` to return active-app/udev/config-exists (kept backward-compatible by adding optional fields).

## Open assumptions

1. **Default config source** — copy current repo-root `config.yml` into `packages/cli/config/default-config.yml` at impl time. Live demo buttons (weather API, etc.) may error if API keys are placeholders; out of wizard scope.
2. **Package manager detection** — `command -v` of the binary. If none found, exit non-zero with manual instructions.
3. **Sudo** — requires user to have sudo configured. NOPASSWD detected via `sudo -n true`. If password needed and no TTY, refuse to elevate and print manual instructions.
4. **First-run marker** — absence of `${xdgConfig_HOME}/sireno-deck/config.yml`. No separate state file.
5. **Stream Deck detection** — udev prompt only shown if `lsusb` matches a PID AND user confirms Stream Deck ownership; otherwise just print udev rules in the summary as "may be needed".

## Risks

- `config.yml` dependent on placeholder API keys (weather) — documented in summary, not the wizard's problem.
- `sudo -S` password capture is sensitive; restrict to TTY only.
- macOS Accessibility permission cannot be auto-granted; wizard prints the manual steps.
- GNOME extension cannot be auto-installed; wizard prints the URL and lets the user re-run.
