---
phase: 07-os-providers
status: not-started
depends_on: [03-deck-runtime]
---

# Phase 07 — OS Providers

Goal: platform-specific implementations for session lock, active app, key macro, media player, host context. Linux / macOS / Windows parity.

## Outcomes

1. `src/system/host-context.ts` — `getHostContext()` returns `{ hostname, platform, userInfo, arch }` via `systeminformation` (Linux) or `os` module (mac/win).
2. `src/system/session-monitor.ts` — `dbus-next` (Linux screensaver), `osascript` (macOS), PowerShell session API (Windows). Emits `session.locked | unlocked` events.
3. `src/system/active-app/` — platform-split providers:
   - `linux/index.ts` — gnome-shell D-Bus + Wayland gnome variant
   - `darwin.ts` — AppleScript `System Events`
   - `windows.ts` — UIA `GetForegroundWindow`
   - `index.ts` — factory `getActiveAppProvider({ platform, env, dbusClient, logger, probe })`
4. `src/system/key-macro/` — platform-split providers:
   - `linux/index.ts` — probe `xdotool`/`ydotool`/`dotool`, pick first available
   - `darwin.ts` — AppleScript `keystroke`
   - `windows.ts` — PowerShell `SendKeys`
   - `index.ts` — factory `getKeyMacroProvider({ platform, env, executor?, logger })`
5. `src/system/media/` — platform-split media providers:
   - `linux/index.ts` — `playerctl` (MPRIS) wrapper
   - `darwin.ts` — `osascript` (Spotify etc.)
   - `windows.ts` — PowerShell SMTC
6. Tests for each provider (mocked).

## Requirements traceability

- **R15** (Linux active-app via gnome-shell D-Bus + Wayland gnome; media via `playerctl`)
- **R16** (macOS osascript; Windows PowerShell + UIA)

## Constraints

- Pure Wayland without gnome-shell is unsupported (legacy behavior).
- Providers must be injectable for testing via factory options.
