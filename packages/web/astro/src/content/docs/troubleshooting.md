---
title: Troubleshooting
description: Common issues and how to resolve them.
---

## The Stream Deck is not detected on Linux

Make sure the udev rules are installed. Run the official Elgato software once on
Windows/macOS to install the rules, or create `/etc/udev/rules.d/95-streamdeck.rules`
manually:

```
SUBSYSTEM=="usb", ATTR{idVendor}=="0fd9", MODE="0666"
```

After adding the rules, reload: `sudo udevadm control --reload-rules && sudo udevadm trigger`.

## `ydotool` is not found

`ydotool` is required for key macro actions (`core:action: keymacro`). Install it
from your package manager:

```sh
# Debian/Ubuntu
sudo apt install ydotool
```

## config.yml fails to validate

Run `sireno config validate` to see exactly which key is wrong. The config schema
is strict — every action must have a `run` field and a valid `action` type.

## Emulator opens as a blank white page

The emulator renders into a Vite-powered React app. If you see a blank page:

1. Open DevTools (`F12`) → Console tab.
2. Look for WebSocket errors — the emulator needs the service running on the same
   host.
3. Check that `sirenodeck start --emulator` is still running.

## Overlay deck does not activate

Overlay decks are tied to window focus. If an overlay deck named `MyApp` does not
activate when `MyApp` window gains focus:

1. Check the window class in your compositor (e.g., `xprop WM_CLASS` on X11).
2. The `windowClass` in `config.yml` must match exactly (case-sensitive).
3. If using Wayland, check that the `wlr-layer-shell` protocol is supported.

## Buttons render with wrong fonts

Fonts are loaded from `assets/` inside the active theme. If IBM Plex fonts are
missing, Sireno Deck falls back to the system sans-serif. Install the IBM Plex
fonts, or override `typography.fontFamily` in your theme's `sirenodeck.json`.

## Daemon stops after disconnecting SSH

The service is tied to your session by default. Use `systemd --user` for a
persistent service:

```sh
systemctl --user enable sirenodeck
systemctl --user start sirenodeck
```

## Getting help

Open an issue at
<https://github.com/sireno-deck/sireno-deck/issues/new/choose>
with the output of `sireno debug-info`.
