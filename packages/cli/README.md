# sireno-deck-2

CLI for managing Elgato Stream Deck devices via a config-driven deck system.

**Status**: Phase 0 scaffold — only `run`, `start`, `stop`, `status` and `--version` are wired.
See `plans/` for the full v2 plan.

## Quick start

```bash
pnpm install
pnpm --filter sireno-deck-2 dev     # runs the CLI via tsx --watch
pnpm test                            # vitest
pnpm lint                            # oxlint
pnpm format                          # oxfmt
pnpm typecheck                       # tsc --noEmit
```

## CLI

```bash
sireno run [--emulator] [--dev] [--config <path>] [--device-model <m>] [--port <N>]
sireno start [--emulator] [--config <path>] [--device-model <m>] [--port <N>]
sireno stop
sireno status
sireno --version
```

## Layout

```
packages/cli/
  bin/sireno.js                 # entry shim (spawns tsx)
  src/
    cli/                        # yargs CLI surface
      index.ts                  # command registry
      main.ts                   # argv parser + handler dispatch
      commands/
        run.ts                  # foreground dev runner
        start.ts                # detached daemon
        stop.ts
        status.ts
    util/                       # logger, daemon pid helpers
    __tests__/                  # vitest suites
    index.ts                    # public exports
    version.ts
```
