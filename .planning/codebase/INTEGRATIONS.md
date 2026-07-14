# Integrations

Sireno Deck has minimal external integrations — it lives on the user's machine and drives local hardware.

## Hardware — Elgato Stream Deck

- **Library:** `@elgato-stream-deck/node` 7.6.3 (raw HID via `node-hid`).
- **Models supported:** MK.2 (default, 15 keys), Plus, Mini, XL (32 keys; ships as `DEFAULT_KEY_COUNT = 15`).
- **Linux:** udev rules in `device/linux-udev.ts` — grants user-space access to Elgato USB devices (vendor `0fd9`, product IDs `0060/006c/006d/006e/0080/0084/0086/0090`).
- **Connection lifecycle:** device discovery → connect → write cache → reconnect on disconnect. Per-model handlers in `device/models/{mk2,plus,mini,xl}.ts`.

## System providers — per-platform adapters

All in `packages/cli/src/system/providers/` with a shared interface (`system/provider.ts`). Per-platform implementations:

| Provider | Purpose | Linux | macOS | Windows |
|----------|---------|-------|-------|---------|
| `active-app/` | Foreground process/window detection | `/proc` + xdotool + D-Bus (GNOME Shell) | AppleScript | UIA |
| `key-macro/` | Send key sequences (Ctrl+V, etc.) | xdotool / ydotool / dotool (auto-detects X11 vs Wayland) | osascript | SendInput |
| `media/` | Play/pause/next/volume | MPRIS over D-Bus | AppleScript | MediaSession API |
| `session-monitor/` | Lockscreen/idle detection | D-Bus | IOKit | WinAPI |
| `clipboard/` | Read/write system clipboard | wl-copy / xclip / xsel | pbcopy / pbpaste | win32 API |
| `brightness/` | Keyboard + Stream Deck LED brightness | brightness-cli / D-Bus | osascript | — |

## WebSocket bridge — local only

- `render/ws-bridge.ts` — `ws` 8.21.0 server on `127.0.0.1` (port picked at startup, default 52937).
- One connection per surface (frontend SPA, emulator SPA, addon frontends).
- Hello handshake with token check (per-session secret, not user identity).
- Channel cache for reconnect replay.
- Protocol: `PROTOCOL_VERSION = 3`, Zod-validated messages in `api/protocol-internal.ts`.

## Browser — Playwright (real-mode screenshots)

- `render/browser-renderer.ts` — Playwright 1.61.1 headless Chromium.
- Screenshots the frontend URL (`?compact=1`), slices per-key, writes to device via `sharp` 0.34.5.
- Only in real mode (not dev/emulator).

## HTTP server — local static serving

- `cli/http-server.ts` — plain `node:http`, serves built frontend SPA from `dist/`.
- Injects `window.__SIRENO_TOKEN__` into HTML for WS handshake auth.
- `/health` endpoint returns `{ status: "ok" }`.

## External APIs — used by built-in addons

| Addon | API | Auth | Endpoint |
|-------|-----|------|----------|
| `weather` | Open-Meteo forecast | None (free, no key) | `https://api.open-meteo.com/v1/forecast` |
| `weather` | Open-Meteo geocoding | None (free, no key) | `https://geocoding-api.open-meteo.com/v1/search` |
| `system-status` | Local only | — | `/proc/stat`, `os.cpus()`, `os.uptime()` |
| `value-display` | User commands | — | `execa("/bin/sh", ["-c", cmd])` |

## npm — 3rd-party addon loading

- CLI installs 3rd-party addons to `~/.cache/sireno-deck/node_modules/` on first run.
- Addon authors declare `sirenoAddonApiVersion` (currently 3) in `package.json`.
- Loaded via dynamic `import()` in `addon/registry.ts`.

## Config & state

- **Config:** `config.yml` (YAML, parsed via `yaml` library, validated with Zod).
- **Runtime state:** in-memory only (pub/sub channels, nav stack, overlay).
- **Persistent KV:** `core/store.ts` — file-backed JSON per addon scope.
- **PID/token:** `$XDG_RUNTIME_DIR/sireno-deck/` (daemon mode).

## What is NOT integrated

- **No cloud sync** — config and state are local-only.
- **No telemetry / analytics.**
- **No auth layer** — everything runs on `127.0.0.1`. The handshake token is just a per-session secret, not user identity.
- **No external DB** — addon KV state goes through `core/store.ts` (file-backed JSON per addon scope).
- **No message queues** — in-process pub/sub only.
- **No webhooks** — the WS bridge is the only real-time channel.
