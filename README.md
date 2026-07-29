# sireno-deck

CLI for managing Elgato Stream Deck devices via a config-driven deck system. Write a `config.yml`, register addons, and the same UI runs in the emulator, on real hardware, or behind a `pnpm dev` daemon.

## Quick start

```bash
# Install
pnpm install

# Run the emulator (browser auto-opens)
pnpm --filter sirenodeck dev start --emulator

# Stop it
pnpm --filter sirenodeck dev stop

# Or, run foreground (Ctrl-C to exit)
pnpm --filter sirenodeck dev run --emulator
```

On first run, `dev` spawns the WS bridge + a vite dev server for the React 19 + Tailwind 4 frontend. The emulator shell opens at `http://127.0.0.1:52938/` and forwards button clicks to the runtime via WS.

## `config.yml` example

```yaml
theme: default
decks:
  main:
    name: Main
    buttons:
      - position: 2
        type: date-time:time
        config:
          variant: big

      - position: 3
        type: date-time:date

      - position: 1
        type: core:action
        config:
          command: "xdg-open https://example.com"

      - position: 4
        type: weather:weather
        config:
          location:
            latitude: 42.2304
            longitude: -8.7256
            name: Vigo

      - position: 0
        type: system-status:system-status
        config:
          variant: bars
          metrics:
            - { metric: cpu_usage, label: CPU }
            - { metric: memory_usage, label: RAM }

      - position: 9
        type: core:change-deck
        config:
          deck: emoji

  emoji:
    name: Emoji
    buttons:
      - position: 0
        type: core:change-deck
        config:
          deck: main

logging:
  level: info
```

Put this at the repo root as `config.yml`. Run `sireno run --emulator` and the deck renders in the browser.

## CLI

```
sireno run   [--emulator] [--dev] [--config <path>] [--device-model <m>] [--port <N>]
sireno start [--emulator] [--config <path>] [--device-model <m>] [--port <N>] [--http-port <N>]
sireno stop
sireno status
sireno --version
```

- `run` — foreground. Ctrl-C stops everything.
- `start` — daemon. Writes PID + token + children files to `$XDG_RUNTIME_DIR/sireno-deck/`. Stop with `sireno stop`.
- `--emulator` — render in browser instead of writing to real hardware.
- `--dev` — use the vite dev server (faster iteration, no build needed).
- `--http-port <N>` — port for the prod HTTP server (default 3939). Only starts when `pnpm --filter sirenodeck-frontend build` has been run.
- `--device-model <mk2|plus|mini|xl>` — change the device layout. `mk2` is the default (15 keys, 5×3).

## How it works

```
                config.yml
                    |
                    v
       loadConfig + validateFull
                    |
                    v
   AddonRegistry { builtins + local addons }
                    |
                    v
   DeckRuntime { pub-sub, gesture state machine }
        |                 |
        v                 v
   WS bridge        vite frontend
   (3937)          (5180)
        |                 |
        v                 v
   emulator shell  <-- iframe --  frontend
   (52938)                         |
                                    v
                              <Deck> + <ButtonFrame>
                              (your addon renders here)
```

Every button gets its own WS handshake. The frontend reads the deck-config + per-button-type surfaces from the theme; addons register React components via `packages/cli/src/addon/api.ts`. Button taps flow back through the WS bridge to the runtime's gesture state machine.

## For addon authors

Each builtin addon ships its own README with button types, config schema, and an example:

- [`core`](packages/cli/src/builtin-addons/core/README.md) — internal: `core:change-deck`, `core:action`, `core:toggle`, `core:page-nav`
- [`internal-settings`](packages/cli/src/builtin-addons/internal-settings/README.md) — internal: `internal-settings:*` (settings overlay)
- [`session`](packages/cli/src/builtin-addons/session/README.md) — the `session:locked` deck
- [`date-time`](packages/cli/src/builtin-addons/date-time/README.md) — `date-time:time`, `date-time:date`, `date-time:date-time`, `date-time:analog-clock`
- [`emoji-selector`](packages/cli/src/builtin-addons/emoji-selector/README.md) — emoji deck generator
- [`media`](packages/cli/src/builtin-addons/media/README.md) — `media:player`, `media:mute`, `media:volume:*`
- [`system-status`](packages/cli/src/builtin-addons/system-status/README.md) — `system-status:system-status`
- [`value-display`](packages/cli/src/builtin-addons/value-display/README.md) — `value-display:display`
- [`weather`](packages/cli/src/builtin-addons/weather/README.md) — `weather:weather`
- [`brightness`](packages/cli/src/builtin-addons/brightness/README.md) — `brightness:brightness`

The addon API is at [`packages/cli/src/addon/api.ts`](packages/cli/src/addon/api.ts). To write a 3rd-party addon, package it as `npm`, set `sirenoAddonApiVersion` in `package.json`, and add its name to `config.yml`'s `addons:` list. The loader installs it to `~/.cache/sireno-deck/node_modules/` on first run.

## License

MIT. See [`LICENSE`](LICENSE).
