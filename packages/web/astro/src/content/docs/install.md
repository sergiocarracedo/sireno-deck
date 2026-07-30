---
title: Install
description: Install Sireno Deck on Linux, macOS, or Windows.
---

## Quick start

Run the latest version of Sireno Deck from `npm` with `pnpm` (recommended) or
`npx`:

```sh
pnpm dlx sirenodeck start --emulator
```

The first run scaffolds a `config.yml` next to your shell, opens the emulator
in your browser, and starts a daemonized service. Press `Ctrl-C` to stop.

For real hardware, drop the `--emulator` flag:

```sh
pnpm dlx sirenodeck start
```

## Prerequisites

- **Node 20 or later.** `sireno` is an ESM-only Node process.
- **A `config.yml`.** The `pnpm` template includes one; you can also start from
  the example in the [project README](https://github.com/sireno-deck/sireno-deck#readme).
- **For real hardware:** the Elgato Stream Deck udev rules on Linux
  (the official Elgato software installs these; if you run a deck-only setup
  follow the [Stream Deck udev guide](https://github.com/sireno-deck/sireno-deck/wiki/Udev-on-Linux)).

## Operating-system notes

### Linux

- `ydotool` is required for keystroke emulation (`core:action`, `keymacro:*`).
- For non-BMP text (emoji, CJK), `wl-copy` is required.
- `xdg-open` for `core:action` launches URLs.

### macOS

Install works out of the box. Key-macro goes through `osascript keystroke`.

### Windows

Key-macro goes through Win32 `SendInput` (a tiny C# helper compiled inline at
init). The first invocation takes a beat to compile.
