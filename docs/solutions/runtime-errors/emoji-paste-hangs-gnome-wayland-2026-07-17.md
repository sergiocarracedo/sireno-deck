---
title: Emoji paste hangs with 3000ms timeout on GNOME Wayland
date: 2026-07-17
category: runtime-errors
module: key-macro provider + system executor
problem_type: runtime_error
severity: high
tags: emoji, wtype, ydotool, wayland, wl-copy, execa, child_process, gnome
symptoms:
  - "ProviderError: Operation timed out after 3000ms after tapping an emoji button"
  - "wtype '🔥' reports 'Compositor does not support the virtual keyboard protocol' on GNOME Wayland"
  - "ydotool key ctrl+v appears to succeed but produces no keystroke (silent no-op)"
  - "sh -c \"'🔥' | wl-copy\" exits 0 but wl-copy receives empty stdin"
root_cause: "Four stacked issues: (1) wtype requires the zwlr_virtual_keyboard_manager_v1 protocol which GNOME Mutter doesn't implement; (2) ydotool's `key` subcommand treats symbolic combo names like `ctrl+v` as single unknown key names and is a no-op; (3) bash parses `'🔥' | wl-copy` as a command name `🔥` (not found) piped to wl-copy, so no data reaches wl-copy; (4) execa awaits the `close` event which never fires because wl-copy's libwayland background threads keep stdio fds open past main exit."
resolution_type: code_fix
---

# Emoji paste hangs with 3000ms timeout on GNOME Wayland

## Problem

Tapping an emoji button on a Stream Deck using `sireno-deck` produced `ProviderError: Operation timed out after 3000ms` on GNOME Wayland. The emoji never reached the focused application. Four distinct issues had to be diagnosed and fixed before emoji typing worked end-to-end on this environment. The original author (me) shipped a "tests pass" claim without verifying the user-facing flow.

## Symptoms

- `ProviderError: Operation timed out after 3000ms` from the runtime after tapping an emoji button.
- `wtype '🔥'` (run manually in bash) reported `Compositor does not support the virtual keyboard protocol`.
- `ydotool key ctrl+v` (run manually) appeared to succeed but produced no keystroke — silent no-op.
- A `printf '%s' '🔥' | wl-copy` test worked from bash but the program's `sh -c "'🔥' | wl-copy"` invocation produced exit 0 with no data on the pipe.
- Manual test of `node -e "..."` invoking `execa('wl-copy', {input: 'x'})` returned in **25 seconds** (not the expected ~100ms).

## What Didn't Work

- **Picking `wtype` as the Linux primary tool**: blocked on GNOME Wayland. Works on wlroots-based compositors (Sway, Hyprland) only.
- **Symbolic ydotool combo syntax (`ydotool key ctrl+v`)**: ydotool's `key` subcommand interprets `ctrl+v` as a single unknown key name. ydotool requires raw scancode syntax (`29:1 47:1 47:0 29:0`) per Linux `input-event-codes.h`.
- **`sh -c "'🔥' | wl-copy"` as the clipboard write command**: bash parses `'🔥'` as a command name (`🔥: not found`) and the pipe source exits immediately with no data. Fix is `sh -c "printf '%s' '🔥' | wl-copy"`.
- **Using `execa` to spawn wl-copy**: execa (v9) awaits the `'close'` event to resolve its promise. `wl-copy`'s libwayland background threads keep its stdio fds open after main exits. `'close'` never fires; execa hangs past the timeout cap. Switched to `child_process.spawn` + `'exit'` event listener.

## Solution

Four coordinated changes in `packages/cli/src`. Commit `41ccfe1c`.

### 1. Linux key-macro provider uses ydotool with clipboard-paste fallback for non-ASCII text

`packages/cli/src/system/providers/key-macro/linux.ts` now probes `ydotool` first, falls back to `wtype` only if ydotool is absent. For non-ASCII literal text (emoji, CJK), it writes the text to the clipboard via `wl-copy` then injects ctrl+v via ydotool's scancode syntax:

```ts
const cmd = `printf '%s' ${shellQuote(text)} | ${WL_COPY_TOOL}`  // sh -c
const YDOTOOL_CTRL_V_ARGS = [
  "key",
  `${SC_LEFTCTRL}:1`,
  `${SC_V}:1`,
  `${SC_V}:0`,
  `${SC_LEFTCTRL}:0`,
]
```

Scancode map (Linux `input-event-codes.h`): `LEFTCTRL=29`, `LEFTALT=56`, `LEFTSHIFT=42`, `LEFTMETA=125`. Letters, digits, named keys, function keys (F1–F24) have full maps in `linux.ts`.

### 2. Clipboard write uses `printf '%s'` to actually emit the string to the pipe

`packages/cli/src/system/providers/clipboard/linux.ts` — `writeText` builds:

```ts
const cmd = `printf '%s' ${shellQuote(text)} | ${WL_COPY_TOOL}`
```

instead of the broken `\`${shellQuote(text)} | ${WL_COPY_TOOL}\``. Bash now emits the string to stdout of `printf`, which is piped into `wl-copy`.

### 3. Executor bypasses execa; uses `child_process.spawn` + `'exit'` event

`packages/cli/src/cli/commands/run.ts`:

```ts
const proc = spawn(command, [...args], { stdio: ["pipe", "pipe", "pipe"] })
proc.stdout.on("data", (chunk) => { stdout += chunk.toString() })
proc.stderr.on("data", (chunk) => { stderr += chunk.toString() })
proc.on("exit", (code) => {
  resolve({ exitCode: code, stdout, stderr, elapsedMs: Date.now() - start })
})
// Timeout via setTimeout → proc.kill("SIGKILL") if exceeded
```

The `'exit'` event fires in ~107ms for `wl-copy`; `'close'` never does.

### 4. Per-step debug logging

`logger.info` traces around each step in the non-ASCII emoji path (`writeText` start/finish, pre-keystroke delay, ctrl+v keystroke) with `elapsedMs`, `exitCode`, and `stderr`. Each `type://` action now produces a self-diagnosing log trail so future failures pinpoint which step is slow.

## Why This Works

- **`wtype` requires `zwlr_virtual_keyboard_manager_v1`**, a wlroots-only protocol. GNOME Mutter (and KDE Plasma <5.27) don't implement it. `ydotool` uses uinput (kernel-level synthetic input device) which works on any compositor because it doesn't need compositor cooperation.
- **`ydotool`'s `key` subcommand is intentionally low-level** — it doesn't translate symbolic names like `ctrl+v` to scancode sequences. The Linux kernel's `input-event-codes.h` is the source of truth. Users find this out by reading the man page or the source; passing `ctrl+v` as a single arg fails silently because no key has that name.
- **Bash parses `'🔥'` as a quoted string in command position** — it looks up `🔥` as a command name. To emit a literal string to a pipe, use `printf '%s' '...'` (canonical) or `<<< here-string`. The bare literal form is a common-but-broken pattern.
- **`wl-copy`'s libwayland-client maintains a Wayland connection in a background thread** that survives main's exit until libwayland's own internal cleanup runs. `execa` waits for `'close'` (stdio fully closed), which doesn't happen until libwayland's threads finish — sometimes 25+ seconds. `'exit'` is the right event for "process actually terminated." `child_process.spawn` with the `'exit'` event resolves immediately.

## Prevention

- **When targeting Wayland tools on Linux, check `$XDG_CURRENT_DESKTOP` before picking a key-injection tool.** GNOME / KDE don't support `wtype`. `ydotool` works on both.
- **For any subprocess call where the binary might keep stdio fds open** (libwayland, libdbus, anything with background threads), use `'exit'` not `'close'`.
- **When building `sh -c "..."` commands that pipe strings, use `printf '%s'`** to emit, never bare quoted literals (they become command-name tokens).
- **Always test the actual subprocess invocation from Node** (`node -e "..."` with `child_process.spawn`) before assuming a CLI tool's behavior. Don't infer from "the bash command works" — Node's child_process has its own quirks.
- **When the user reports a timeout, add per-step `logger.info` traces** before changing anything else. Saves hours of guessing.
- **Never ship a fix without verifying the user-facing flow end-to-end.** "Tests pass" is not the same as "the user can tap a button and see the emoji land."

## Related

- `type://` URI scheme (renamed from `paste://` + `macro://`) introduced in the same commit `41ccfe1c` — `CHANGELOG.md`.
- `Methods.typeText(text)` ergonomic addon API added in the same commit.
- Scancode constants in `packages/cli/src/system/providers/key-macro/linux.ts` — the canonical reference table.