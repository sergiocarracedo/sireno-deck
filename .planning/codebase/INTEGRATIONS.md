# Integrations

Sireno Deck has minimal external integrations — it lives on the user's machine and drives local hardware.

## Hardware — Elgato Stream Deck

- **Library:** `@elgato-stream-deck/node` ^7.6 (raw HID via `node-hid`).
- **Models supported:** MK.2 (default, 15 keys), Plus, Mini, XL (32 keys; ships as `DEFAULT_KEY_COUNT = 15`).
- **Linux:** udev rules live in `device/linux-udev.ts`. Setup helpers bundled.
- **Connection lifecycle:** device discovery → connect → write cache → reconnect on disconnect. `device/models/{mk2,plus,mini,xl}.ts` per-model handlers.

## System providers — per-platform

All in `packages/cli/src/system/` with adapter pattern (`system/provider.ts` is the interface, per-platform impls in subdirs):

- `active-app/` — polls foreground process/window name. Linux: `/proc` + xdotool; macOS: AppleScript; Windows: UIA. Used to trigger overlay decks.
- `key-macro/` — sends Ctrl+V / Cmd+V / arbitrary key sequences. Linux: xdotool; macOS: osascript; Windows: SendInput.
- `media/` — MPRIS over D-Bus on Linux, AppleScript on macOS, MediaSession API on Windows.
- `session-monitor/` — lockscreen/idle detection.
- `clipboard/` — write-only (pasteText uses it before sending paste keystroke).
- `brightness/` — keyboard brightness + Stream Deck LED brightness (via `brightness-cli` or DBus).

## Browser — Playwright (real-mode screenshots)

Real mode uses Playwright in headless mode to screenshot the frontend URL with `?compact=1`. The result is sliced and written to the device key-by-key. No Playwright in dev/emulator flows.

## WebSocket bridge — local only

`render/ws-bridge.ts` runs a `ws` server on `127.0.0.1` (port picked at startup, default 52937). One connection per surface (frontend SPA, emulator SPA, addon frontend SPAs). Hello handshake with token check; channel cache for reconnects.

## npm — 3rd-party addon loading

The CLI installs 3rd-party addons to `~/.cache/sireno-deck/node_modules/` on first run. Addon authors package as npm and declare `sirenoAddonApiVersion` in `package.json`. Loaded via dynamic `import()` in the registry.

## GitHub / APIs read by addons

Built-in addons use public APIs for their data:
- `weather` — Open-Meteo (no key, latitude/longitude lookup).
- `system-status` — local only (`/proc/stat`, `os.cpus()`, `os.uptime()`).
- `value-display` — runs user commands and renders output.

## What is NOT integrated

- **No cloud sync** — config and state are local-only (`$XDG_RUNTIME_DIR/sireno-deck/` for pid/token, in-memory for runtime state).
- **No telemetry / analytics.**
- **No auth layer** — everything runs on `127.0.0.1`. The token in the handshake is just a per-session secret, not user identity.
- **No external DB** — addon KV state goes through `core/store.ts` (file-backed JSON per addon scope).