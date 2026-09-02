# sirenodeck (CLI internals)

Internal docs for the `sireno` CLI package. **User-facing docs** (quickstart, config.yml example, addon list) live at the [repo-root README](../../README.md).

## Scripts

| Command                                   | Purpose                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| `pnpm --filter @sirenodeck/cli dev`       | `node bin/dev.js` — dev CLI shim                               |
| `pnpm --filter @sirenodeck/cli start`     | `node --import tsx src/cli/main.ts` — production-style startup |
| `pnpm --filter @sirenodeck/cli build`     | bundles the frontend (`vite build`) and the CLI                |
| `pnpm --filter @sirenodeck/cli test`      | `vitest run`                                                   |
| `pnpm --filter @sirenodeck/cli typecheck` | `tsc --noEmit`                                                 |
| `pnpm --filter @sirenodeck/cli lint`      | `oxlint src`                                                   |
| `pnpm --filter @sirenodeck/cli format`    | `oxfmt src`                                                    |

## Layout

```
packages/cli/
  bin/
    sireno.js                # entry shim (spawns tsx)
    dev.js                   # dev shim (pnpm + vite)
  src/
    cli/                     # yargs CLI surface
      main.ts                # argv parser + handler dispatch
      index.ts               # command registry
      http-server.ts         # prod HTTP server (in-memory WS token injection)
      commands/
        run.ts               # foreground dev runner
        start.ts             # detached daemon
        stop.ts              # SIGTERM → 5s → SIGKILL on children + daemon
        status.ts            # pid + token preview + tracked children
        emulator-mode.ts     # WS bridge + virtual-device vite children spawner
        real-mode.ts         # Playwright screenshot → hardware write
    addon/                   # addon API + loader (local + npm)
    api/                     # shared types
    builtin-addons/          # 10 builtin addons
    core/                    # gesture state machine, pub-sub, store
    deck/                    # deck runtime + methods
    device/                  # device enumeration + models (mk2, plus, mini, xl)
    os-providers/            # session, active-app, key-macro, media (Linux/macOS/Windows)
    render/                  # Playwright + sharp + WS bridge
    themes/
      default/               # default theme (ButtonFrame + 4 surfaces)
      light/                 # light theme override
    util/                    # daemon, logger, cache-paths, device-config
    vite/                    # vite plugin (sirenoDeck2)
  frontend/                  # vite React 19 + Tailwind 4 frontend
  config-ui/                  # vite configuration UI shell
```

## Conventions

- **No comments in code** unless the task description explicitly asks for them.
- **Indentation:** 2 spaces, no tabs.
- **Quotes:** single quotes.
- **Semicolons:** none.
- **Trailing commas:** all.
- **Print width:** 110.
- **Imports:** no file extensions on relative imports.

## Architecture rules

- All cross-package code lives in `packages/cli`. No other packages in the workspace.
- Sub-path exports: `.`, `./api`, `./react`, `./vite`.
- Addon contract: `SIRENO_ADDON_API_VERSION = 3`.
- WS protocol version: 3.
- `core:*` prefix on all built-in button types.
